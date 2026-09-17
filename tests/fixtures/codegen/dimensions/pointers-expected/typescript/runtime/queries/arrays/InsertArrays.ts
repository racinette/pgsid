import type { InsertArraysParams } from "../../../types/queries/arrays/InsertArrays.js";
export type { InsertArraysParams } from "../../../types/queries/arrays/InsertArrays.js";
import type * as pgsid from "./pgsid/queryable.js";
export const insertArraysSql = "INSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nVALUES ($1, $2, $3, $4, $5);";
export async function insertArrays(db: pgsid.Queryable, params: InsertArraysParams): Promise<void> {
    await db.query(insertArraysSql, [params["id"], params["ordinary"], params["matrix"], params["flexible"], params["owners"]]);
}
