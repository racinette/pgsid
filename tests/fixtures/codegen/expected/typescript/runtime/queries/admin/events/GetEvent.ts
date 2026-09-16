import type { GetEventParams, GetEventRow } from "../../../../types/queries/admin/events/GetEvent.js";
export type { GetEventParams, GetEventRow } from "../../../../types/queries/admin/events/GetEvent.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getEventSql = "SELECT id, source_id, state, metadata FROM billing.events WHERE id = $1;";
export async function getEvent(db: pgsid.Queryable, params: GetEventParams): Promise<GetEventRow | undefined> {
    const result = await db.query(getEventSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetEventRow;
}
