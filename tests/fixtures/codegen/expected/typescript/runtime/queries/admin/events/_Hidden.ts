import type { HiddenParams, HiddenRow } from "../../../../types/queries/admin/events/_Hidden.js";
export type { HiddenParams, HiddenRow } from "../../../../types/queries/admin/events/_Hidden.js";
import type * as pgsid from "./pgsid/queryable.js";
function decodeInt(value: string | null): number | null {
    return value === null ? null : Number(value);
}
export const hiddenSql = "SELECT 3 AS value;";
export async function hidden(db: pgsid.Queryable): Promise<HiddenRow | undefined> {
    const result = await db.queryText(hiddenSql, []);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "value": decodeInt(values[0]) };
    return row as HiddenRow;
}
