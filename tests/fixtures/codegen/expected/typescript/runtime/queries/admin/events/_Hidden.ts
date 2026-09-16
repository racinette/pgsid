import type { HiddenParams, HiddenRow } from "../../../../types/queries/admin/events/_Hidden.js";
export type { HiddenParams, HiddenRow } from "../../../../types/queries/admin/events/_Hidden.js";
import type * as pgsid from "./pgsid/queryable.js";
export const hiddenSql = "SELECT 3 AS value;";
export async function hidden(db: pgsid.Queryable): Promise<HiddenRow | undefined> {
    const result = await db.query(hiddenSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as HiddenRow;
}
