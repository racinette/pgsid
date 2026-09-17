import type { OptionalFlexibleParams, OptionalFlexibleRow } from "../../../types/queries/arrays/OptionalFlexible.js";
export type { OptionalFlexibleParams, OptionalFlexibleRow } from "../../../types/queries/arrays/OptionalFlexible.js";
import type * as pgsid from "./pgsid/queryable.js";
export const optionalFlexibleSql = "SELECT optional_flexible FROM arrays;";
export async function optionalFlexible(db: pgsid.Queryable): Promise<OptionalFlexibleRow | undefined> {
    const result = await db.query(optionalFlexibleSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as OptionalFlexibleRow;
}
