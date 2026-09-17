import type { GetAccessParams, GetAccessRow } from "../../../types/queries/arrays/GetAccess.js";
export type { GetAccessParams, GetAccessRow } from "../../../types/queries/arrays/GetAccess.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getAccessSql = "SELECT matrix[1][2] AS element, matrix[1] AS incomplete,\nmatrix[1:2][1:2] AS sliced, flexible[1:2] AS flexible_slice FROM arrays;";
export async function getAccess(db: pgsid.Queryable): Promise<GetAccessRow | undefined> {
    const result = await db.query(getAccessSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetAccessRow;
}
