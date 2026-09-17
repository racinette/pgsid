import type { GetNestedParams, GetNestedRow } from "../../../types/queries/arrays/GetNested.js";
export type { GetNestedParams, GetNestedRow } from "../../../types/queries/arrays/GetNested.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getNestedSql = "WITH first AS (SELECT matrix, flexible FROM arrays),\nsecond AS (SELECT matrix AS renamed, flexible FROM first)\nSELECT renamed, flexible FROM second;";
export async function getNested(db: pgsid.Queryable): Promise<GetNestedRow | undefined> {
    const result = await db.query(getNestedSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetNestedRow;
}
