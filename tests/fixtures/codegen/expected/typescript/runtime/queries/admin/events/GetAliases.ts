import type { GetAliasesParams, GetAliasesRow } from "../../../../types/queries/admin/events/GetAliases.js";
export type { GetAliasesParams, GetAliasesRow } from "../../../../types/queries/admin/events/GetAliases.js";
import type * as pgsid from "./pgsid/queryable.js";
function decodeBigint(value: string | null): bigint | null {
    return value === null ? null : BigInt(value);
}
export const getAliasesSql = "SELECT p.id AS public_id, q.id AS dotted_id, r.id AS underscored_id\nFROM public.events p, \"billing.extra\".events q, billing_extra.events r;";
export async function getAliases(db: pgsid.Queryable): Promise<GetAliasesRow | undefined> {
    const result = await db.queryText(getAliasesSql, []);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "public_id": decodeBigint(values[0]), "dotted_id": decodeBigint(values[1]), "underscored_id": decodeBigint(values[2]) };
    return row as GetAliasesRow;
}
