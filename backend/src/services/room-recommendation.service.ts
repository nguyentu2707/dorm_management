import { AppError } from "../errors/AppError.js";
import type { ScheduleEntry } from "../models/class-schedule.model.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type {
  IRoomPreferenceRepository,
  RoomPreferenceData,
} from "../repositories/interfaces/room-preference.repository.interface.js";
import type { IClassScheduleRepository } from "../repositories/interfaces/class-schedule.repository.interface.js";
import type {
  IRoomRecommendationRepository,
  RecommendationCandidate,
} from "../repositories/interfaces/room-recommendation.repository.interface.js";
import {
  ADAPTIVE_WEIGHTS,
  BASE_SIGNAL_WEIGHTS,
  MAX_CLASS_PERIOD,
  PERSONALIZED_THRESHOLD,
  ROOM_PRICE_BUCKETS,
} from "../config/recommendation.js";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export function scheduleVector(entries: ScheduleEntry[]) {
  const vector = Array(DAYS.length * MAX_CLASS_PERIOD).fill(0) as number[];
  for (const entry of entries) {
    const day = DAYS.indexOf(entry.dayOfWeek);
    for (let period = entry.startPeriod; period <= entry.endPeriod; period++)
      vector[day * MAX_CLASS_PERIOD + period - 1] = 1;
  }
  return vector;
}
export function scheduleSimilarity(a: ScheduleEntry[], b: ScheduleEntry[]) {
  const av = scheduleVector(a),
    bv = scheduleVector(b);
  const dot = av.reduce((sum, value, index) => sum + value * bv[index]!, 0);
  const an = Math.sqrt(av.reduce((sum, value) => sum + value * value, 0));
  const bn = Math.sqrt(bv.reduce((sum, value) => sum + value * value, 0));
  return an && bn ? dot / (an * bn) : 0;
}

type Signal = { value: number; weight: number; reason?: string };
export class RoomRecommendationService {
  constructor(
    private students: IStudentRepository,
    private contracts: IContractRepository,
    private preferences: IRoomPreferenceRepository,
    private schedules: IClassScheduleRepository,
    private candidates: IRoomRecommendationRepository,
  ) {}
  private base(
    candidate: RecommendationCandidate,
    preference: RoomPreferenceData | null,
  ) {
    const signals: Signal[] = [
      {
        value:
          candidate.availableBedCount / Math.max(1, candidate.room.capacity),
        weight: BASE_SIGNAL_WEIGHTS.availability,
        reason:
          candidate.availableBedCount / Math.max(1, candidate.room.capacity) >=
          0.5
            ? "Phòng còn nhiều giường trống."
            : undefined,
      },
    ];
    if (preference?.pricePreference && preference.pricePreference !== "ANY") {
      const price = candidate.room.pricePerMonth;
      const matches =
        preference.pricePreference === "LOW"
          ? price <= ROOM_PRICE_BUCKETS.LOW_MAX
          : price > ROOM_PRICE_BUCKETS.LOW_MAX &&
            price <= ROOM_PRICE_BUCKETS.MEDIUM_MAX;
      signals.push({
        value: matches ? 1 : 0,
        weight: BASE_SIGNAL_WEIGHTS.price,
        reason: matches ? "Phù hợp với mức giá bạn ưu tiên." : undefined,
      });
    }
    if (preference?.wantsHotWater === true)
      signals.push({
        value: candidate.hasHotWater ? 1 : 0,
        weight: BASE_SIGNAL_WEIGHTS.amenity,
        reason: candidate.hasHotWater ? "Phòng có bình nóng lạnh." : undefined,
      });
    if (
      preference?.occupancyPreference &&
      preference.occupancyPreference !== "ANY"
    ) {
      const value =
        preference.occupancyPreference === "MORE_EMPTY"
          ? candidate.availableBedCount / Math.max(1, candidate.room.capacity)
          : candidate.occupiedBedCount / Math.max(1, candidate.room.capacity);
      signals.push({
        value,
        weight: BASE_SIGNAL_WEIGHTS.occupancy,
        reason:
          value >= 0.5
            ? preference.occupancyPreference === "MORE_EMPTY"
              ? "Phù hợp vì phòng còn nhiều chỗ."
              : "Phù hợp vì phòng đã có nhiều sinh viên."
            : undefined,
      });
    }
    const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
    return {
      score:
        signals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) /
        totalWeight,
      reasons: signals.flatMap((signal) =>
        signal.reason ? [signal.reason] : [],
      ),
    };
  }
  async recommend(userId: string, limit: number) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    if (!student.gender)
      throw new AppError(409, "STUDENT_GENDER_REQUIRED", "Hãy cập nhật giới tính trước khi nhận gợi ý phòng");
    if (await this.contracts.findPendingOrActiveByStudentId(student.id))
      throw new AppError(
        409,
        "STUDENT_ALREADY_HAS_OPEN_CONTRACT",
        "Bạn đã có đăng ký hoặc hợp đồng đang hiệu lực.",
      );
    const [preferenceDoc, scheduleDoc, candidates] = await Promise.all([
      this.preferences.findByStudentId(student.id),
      this.schedules.findByStudentId(student.id),
      this.candidates.findCandidates(student.gender),
    ]);
    const requesterSchedule = scheduleDoc?.entries ?? null;
    const items = candidates.map((candidate) => {
      const totalResidents = candidate.occupiedBedCount;
      const scheduledResidents = candidate.residentSchedules.length;
      const scheduleCoverage = totalResidents
        ? scheduledResidents / totalResidents
        : 0;
      const personalizationLevel =
        !requesterSchedule || !totalResidents || scheduleCoverage === 0
          ? ("BASIC" as const)
          : scheduleCoverage >= PERSONALIZED_THRESHOLD
            ? ("PERSONALIZED" as const)
            : ("PARTIAL" as const);
      const base = this.base(candidate, preferenceDoc);
      const scheduleScore =
        personalizationLevel === "BASIC"
          ? 0
          : candidate.residentSchedules.reduce(
              (sum, entries) =>
                sum + scheduleSimilarity(requesterSchedule!, entries),
              0,
            ) / scheduledResidents;
      const weights = ADAPTIVE_WEIGHTS[personalizationLevel];
      const reasons = [...base.reasons];
      if (personalizationLevel !== "BASIC")
        reasons.push(
          `Lịch học tương đồng với ${scheduledResidents}/${totalResidents} sinh viên có dữ liệu.`,
        );
      if (!reasons.length)
        reasons.push("Gợi ý dựa trên giá, tiện nghi và tình trạng phòng.");
      return {
        personalizationLevel,
        room: candidate.room,
        availableBedCount: candidate.availableBedCount,
        compatibilityScore: Math.round(
          (base.score * weights.base + scheduleScore * weights.schedule) * 100,
        ),
        scheduleCoverage: Math.round(scheduleCoverage * 100) / 100,
        reasons,
      };
    });
    items.sort(
      (a, b) =>
        b.compatibilityScore - a.compatibilityScore ||
        a.room.building.name.localeCompare(b.room.building.name, "vi") ||
        a.room.roomNumber.localeCompare(b.room.roomNumber, "vi"),
    );
    return {
      hasPreference: !!preferenceDoc,
      hasSchedule: !!scheduleDoc,
      items: items.slice(0, limit),
    };
  }
}
