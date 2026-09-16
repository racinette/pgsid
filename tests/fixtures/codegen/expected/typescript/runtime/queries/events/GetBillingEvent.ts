import type { GetBillingEventParams, GetBillingEventRow } from "../../../types/queries/events/GetBillingEvent.js";
export type { GetBillingEventParams, GetBillingEventRow } from "../../../types/queries/events/GetBillingEvent.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getBillingEventSql = "SELECT id, source_id, state FROM billing.events WHERE id = $1;";
export async function getBillingEvent(db: pgsid.Queryable, params: GetBillingEventParams): Promise<GetBillingEventRow | undefined> {
    const result = await db.query(getBillingEventSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetBillingEventRow;
}
