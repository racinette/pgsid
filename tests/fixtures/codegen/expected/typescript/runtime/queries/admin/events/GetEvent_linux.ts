import type { GetEventLinuxParams, GetEventLinuxRow } from "../../../../types/queries/admin/events/GetEvent_linux.js";
export type { GetEventLinuxParams, GetEventLinuxRow } from "../../../../types/queries/admin/events/GetEvent_linux.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getEventLinuxSql = "SELECT 1 AS value;";
export async function getEventLinux(db: pgsid.Queryable): Promise<GetEventLinuxRow | undefined> {
    const result = await db.query(getEventLinuxSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetEventLinuxRow;
}
