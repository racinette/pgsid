import type { UpdateFlexibleParams } from "../../../types/queries/arrays/UpdateFlexible.js";
export type { UpdateFlexibleParams } from "../../../types/queries/arrays/UpdateFlexible.js";
import type * as pgsid from "./pgsid/queryable.js";
export const updateFlexibleSql = "UPDATE arrays SET flexible = $1, optional_flexible = $2 WHERE id = $3;";
export async function updateFlexible(db: pgsid.Queryable, params: UpdateFlexibleParams): Promise<number> {
    const result = await db.query(updateFlexibleSql, [params["flexible"], params["optional"], params["id"]]);
    return result.rowCount ?? 0;
}
