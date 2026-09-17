import type { SharedDimensionsParams } from "../../../types/queries/arrays/SharedDimensions.js";
export type { SharedDimensionsParams } from "../../../types/queries/arrays/SharedDimensions.js";
import type * as pgsid from "./pgsid/queryable.js";
export const sharedDimensionsSql = "INSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nVALUES (1, ARRAY[1], $1, $1, ARRAY[1]::user_id[]);";
export async function sharedDimensions(db: pgsid.Queryable, params: SharedDimensionsParams): Promise<void> {
    await db.query(sharedDimensionsSql, [params["shared"]]);
}
