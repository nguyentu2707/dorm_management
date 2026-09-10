import type { IRoomRecommendationRepository } from "../interfaces/room-recommendation.repository.interface.js";
import type { RecommendationCandidate } from "../interfaces/room-recommendation.repository.interface.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresRoomRecommendationRepository implements IRoomRecommendationRepository {
  async findCandidates(
    ...[gender]: Parameters<IRoomRecommendationRepository["findCandidates"]>
  ): ReturnType<IRoomRecommendationRepository["findCandidates"]> {
    const result = await rows<
      RecommendationCandidate & { price: number }
    >(`SELECT
 json_build_object('id',r.id,'roomNumber',r.room_number,'building',json_build_object('id',b.id,'name',b.name),'capacity',rt.capacity) AS room,
 rt.price_per_month AS price,stats.empty AS "availableBedCount",stats.occupied AS "occupiedBedCount",
 EXISTS(SELECT 1
      FROM equipment_items e
      JOIN equipment_categories ec ON ec.id=e.category_id
      WHERE e.room_id=r.id AND e.condition IN ('NEW','GOOD') AND lower(ec.name)=lower('Bình nóng lạnh')) AS "hasHotWater",
 COALESCE((SELECT json_agg(res.entries)
      FROM (SELECT COALESCE((SELECT json_agg(json_build_object('dayOfWeek',ce.day_of_week,'startPeriod',ce.start_period,'endPeriod',ce.end_period)
      ORDER BY ce.ordinal)
      FROM class_schedule_entries ce
      WHERE ce.schedule_id=cs.id),'[]'::json) AS entries
      FROM contracts c
      JOIN class_schedules cs ON cs.student_id=c.student_id
      WHERE c.room_id=r.id AND c.status='ACTIVE') res),'[]'::json) AS "residentSchedules"

      FROM rooms r
      JOIN buildings b ON b.id=r.building_id
      JOIN room_types rt ON rt.id=r.room_type_id

      JOIN LATERAL (SELECT count(*) FILTER(WHERE status='EMPTY') AS empty,count(*) FILTER(WHERE status='OCCUPIED') AS occupied
      FROM beds
      WHERE room_id=r.id) stats ON stats.empty>0

      WHERE r.status='AVAILABLE' AND b.status='ACTIVE'
        AND (b.allowed_gender='MIXED' OR b.allowed_gender=$1)
      ORDER BY b.name,r.room_number,r.id`, [gender]);
    return result.map(({ price, ...row }) => ({
      ...row,
      room: { ...row.room, pricePerMonth: price },
    }));
  }
}
export { PostgresRoomRecommendationRepository as RoomRecommendationRepository };
