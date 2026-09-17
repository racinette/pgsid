import type { InsertFromCteParams } from "../../../types/queries/arrays/InsertFromCte.js";
export type { InsertFromCteParams } from "../../../types/queries/arrays/InsertFromCte.js";
import type * as pgsid from "./pgsid/queryable.js";
export const insertFromCteSql = "WITH input AS (SELECT $1::integer[] AS matrix, $2::integer[] AS flexible)\nINSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nSELECT 1, ARRAY[1], matrix, flexible, ARRAY[1]::user_id[] FROM input;";
export async function insertFromCte(db: pgsid.Queryable, params: InsertFromCteParams): Promise<void> {
    await db.query(insertFromCteSql, [params["matrix"], params["flexible"]]);
}
