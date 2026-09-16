import type { GetAliasesParams, GetAliasesRow } from "../../../../types/queries/admin/events/GetAliases.js";
export type { GetAliasesParams, GetAliasesRow } from "../../../../types/queries/admin/events/GetAliases.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getAliasesSql = "SELECT p.id AS public_id, q.id AS dotted_id, r.id AS underscored_id\nFROM public.events p, \"billing.extra\".events q, billing_extra.events r;";
export async function getAliases(db: pgsid.Queryable): Promise<GetAliasesRow | undefined> {
    const result = await db.query(getAliasesSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetAliasesRow;
}
