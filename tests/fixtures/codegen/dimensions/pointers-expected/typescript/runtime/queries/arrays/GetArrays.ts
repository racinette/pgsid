import type { GetArraysParams, GetArraysRow } from "../../../types/queries/arrays/GetArrays.js";
export type { GetArraysParams, GetArraysRow } from "../../../types/queries/arrays/GetArrays.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getArraysSql = "SELECT ordinary, matrix, cube, flexible, optional_flexible, owners FROM arrays WHERE id = $1;";
export async function getArrays(db: pgsid.Queryable, params: GetArraysParams): Promise<GetArraysRow | undefined> {
    const result = await db.query(getArraysSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetArraysRow;
}
