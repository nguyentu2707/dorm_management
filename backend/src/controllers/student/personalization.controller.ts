import type { RequestHandler } from "express";
import type { StudentPersonalizationService } from "../../services/student-personalization.service.js";
import type { RoomRecommendationService } from "../../services/room-recommendation.service.js";
import type { AuthRequest } from "../../types/common.types.js";
export class StudentPersonalizationController {
  constructor(private personalization: StudentPersonalizationService, private recommendations: RoomRecommendationService) {}
  preference: RequestHandler = async (q: AuthRequest, r, n) => { try { r.json({ success: true, message: "Nhu cầu phòng", data: await this.personalization.getPreference(q.user!.userId) }); } catch (e) { n(e); } };
  putPreference: RequestHandler = async (q: AuthRequest, r, n) => { try { r.json({ success: true, message: "Đã lưu nhu cầu phòng", data: await this.personalization.putPreference(q.user!.userId, q.body) }); } catch (e) { n(e); } };
  deletePreference: RequestHandler = async (q: AuthRequest, r, n) => { try { await this.personalization.deletePreference(q.user!.userId); r.json({ success: true, message: "Đã xóa nhu cầu phòng", data: null }); } catch (e) { n(e); } };
  schedule: RequestHandler = async (q: AuthRequest, r, n) => { try { r.json({ success: true, message: "Lịch học", data: await this.personalization.getSchedule(q.user!.userId) }); } catch (e) { n(e); } };
  putSchedule: RequestHandler = async (q: AuthRequest, r, n) => { try { r.json({ success: true, message: "Đã lưu lịch học", data: await this.personalization.putSchedule(q.user!.userId, q.body.entries) }); } catch (e) { n(e); } };
  deleteSchedule: RequestHandler = async (q: AuthRequest, r, n) => { try { await this.personalization.deleteSchedule(q.user!.userId); r.json({ success: true, message: "Đã xóa lịch học", data: null }); } catch (e) { n(e); } };
  recommend: RequestHandler = async (q: AuthRequest, r, n) => { try { r.json({ success: true, message: "Gợi ý phòng", data: await this.recommendations.recommend(q.user!.userId, Number(q.query.limit)) }); } catch (e) { n(e); } };
}
