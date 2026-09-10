import type { IDemoSeedRepository } from "../interfaces/demo-seed.repository.interface.js";
import type { SeedBed } from "../interfaces/demo-seed.repository.interface.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresDemoSeedRepository implements IDemoSeedRepository {
  async diagnostics(
    ...[]: Parameters<IDemoSeedRepository["diagnostics"]>
  ): ReturnType<IDemoSeedRepository["diagnostics"]> {
    return required(`SELECT (SELECT count(*)
      FROM buildings) AS buildings,(SELECT count(*)
      FROM rooms) AS rooms,count(*) AS "bedsTotal",count(*) FILTER(WHERE status='EMPTY') AS "bedsEmpty",count(*) FILTER(WHERE status='OCCUPIED') AS "bedsOccupied"
      FROM beds`);
  }
  async bedsStable(
    ...[]: Parameters<IDemoSeedRepository["bedsStable"]>
  ): ReturnType<IDemoSeedRepository["bedsStable"]> {
    return rows<SeedBed>(`SELECT bed.id,bed.status,bed.bed_number,bed.room_id,r.room_number,r.status AS "roomStatus",b.name AS building_name,b.status AS "buildingStatus",b.allowed_gender AS "allowedGender"
      FROM beds bed
      JOIN rooms r ON r.id=bed.room_id
      JOIN buildings b ON b.id=r.building_id
      ORDER BY b.name,r.room_number,bed.bed_number,bed.id`);
  }
  async consistency(
    ...[]: Parameters<IDemoSeedRepository["consistency"]>
  ): ReturnType<IDemoSeedRepository["consistency"]> {
    return required(`SELECT
 (SELECT count(*)
      FROM contracts
      WHERE status='ACTIVE') AS "activeContracts",
 (SELECT count(*)
      FROM contracts c
      JOIN beds b ON b.id=c.bed_id
      WHERE c.status='ACTIVE' AND b.status<>'OCCUPIED') AS "activeOnNonOccupiedBeds",
 (SELECT count(*)
      FROM (SELECT bed_id
      FROM contracts
      WHERE status='ACTIVE'
      GROUP BY bed_id HAVING count(*)>1) x) AS "bedsWithMultipleActiveContracts",
 (SELECT count(*)
      FROM rooms r
      WHERE r.status='FULL' AND EXISTS(SELECT 1
      FROM beds b
      WHERE b.room_id=r.id AND b.status='EMPTY')) AS "fullRoomsWithEmptyBeds"`);
  }
}
export { PostgresDemoSeedRepository as DemoSeedRepository };
