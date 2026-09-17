import type { ReturnFlexibleParams, ReturnFlexibleRow } from "../../../types/queries/arrays/ReturnFlexible.js";
export type { ReturnFlexibleParams, ReturnFlexibleRow } from "../../../types/queries/arrays/ReturnFlexible.js";
import type * as pgsid from "./pgsid/queryable.js";
export const returnFlexibleSql = "UPDATE arrays SET flexible = $1 WHERE id = $2 RETURNING flexible;";
export async function returnFlexible(db: pgsid.Queryable, params: ReturnFlexibleParams): Promise<ReturnFlexibleRow | undefined> {
    const result = await db.query(returnFlexibleSql, [params["flexible"], params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as ReturnFlexibleRow;
}
