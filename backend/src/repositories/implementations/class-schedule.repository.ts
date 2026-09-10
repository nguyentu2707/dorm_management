import type { IClassScheduleRepository } from "../interfaces/class-schedule.repository.interface.js";
import type { ClassScheduleDocument } from "../../models/class-schedule.model.js";
import { PostgresTransactionManager } from "../../services/transaction-manager.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresClassScheduleRepository implements IClassScheduleRepository {
  async findByStudentId(
    ...[id]: Parameters<IClassScheduleRepository["findByStudentId"]>
  ): ReturnType<IClassScheduleRepository["findByStudentId"]> {
    return one<ClassScheduleDocument>(
      `SELECT cs.*,COALESCE((SELECT json_agg(json_build_object('dayOfWeek',day_of_week,'startPeriod',start_period,'endPeriod',end_period)
      ORDER BY ordinal)
      FROM class_schedule_entries
      WHERE schedule_id=cs.id),'[]'::json) AS entries
      FROM class_schedules cs
      WHERE cs.student_id=$1`,
      [id],
    );
  }
  async upsert(
    ...[id, entries]: Parameters<IClassScheduleRepository["upsert"]>
  ): ReturnType<IClassScheduleRepository["upsert"]> {
    return new PostgresTransactionManager().runInTransaction(async (s) => {
      const schedule = await required<{ id: string }>(
        `INSERT INTO class_schedules(student_id)
      VALUES ($1)
      ON CONFLICT ON CONSTRAINT uq_class_schedules_student_id DO UPDATE
      SET updated_at=now()
      RETURNING id`,
        [id],
        s,
      );
      await query(
        `DELETE FROM class_schedule_entries WHERE schedule_id=$1`,
        [schedule.id],
        s,
      );
      if (entries.length)
        await query(
          `INSERT INTO class_schedule_entries(schedule_id,ordinal,day_of_week,start_period,end_period) SELECT $1,ord,day,startp,endp
      FROM unnest($2::integer[],$3::text[],$4::integer[],$5::integer[]) AS x(ord,day,startp,endp)`,
          [
            schedule.id,
            entries.map((_, i) => i),
            entries.map((e) => e.dayOfWeek),
            entries.map((e) => e.startPeriod),
            entries.map((e) => e.endPeriod),
          ],
          s,
        );
      return (await this.findByStudentId(id))!;
    });
  }
  async deleteByStudentId(
    ...[id]: Parameters<IClassScheduleRepository["deleteByStudentId"]>
  ): ReturnType<IClassScheduleRepository["deleteByStudentId"]> {
    await query(
      `DELETE FROM class_schedules WHERE student_id=$1`,
      [id],
      undefined,
    );
  }
}
export { PostgresClassScheduleRepository as ClassScheduleRepository };
