import type { ReturnManyParams, ReturnManyRow } from "../../../types/queries/arrays/ReturnMany.js";
export type { ReturnManyParams, ReturnManyRow } from "../../../types/queries/arrays/ReturnMany.js";
import type * as pgsid from "./pgsid/queryable.js";
export const returnManySql = "UPDATE arrays SET flexible = $1 RETURNING flexible;";
export async function returnMany(db: pgsid.Queryable, params: ReturnManyParams): Promise<ReturnManyRow[]> {
    const result = await db.query(returnManySql, [params["flexible"]]);
    return result.rows.map(row => {
        return row as ReturnManyRow;
    });
}
