import type { GetEventLinuxParams, GetEventLinuxRow } from "../../../../types/queries/admin/events/GetEvent_linux.js";
export type { GetEventLinuxParams, GetEventLinuxRow } from "../../../../types/queries/admin/events/GetEvent_linux.js";
import type * as pgsid from "./pgsid/queryable.js";
function decodeInt(value: string | null): number | null {
    return value === null ? null : Number(value);
}
export const getEventLinuxSql = "SELECT 1 AS value;";
export async function getEventLinux(db: pgsid.Queryable): Promise<GetEventLinuxRow | undefined> {
    const result = await db.queryText(getEventLinuxSql, []);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "value": decodeInt(values[0]) };
    return row as GetEventLinuxRow;
}
