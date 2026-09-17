import type { InsertUncheckedParams } from "../../../types/queries/items/InsertUnchecked.js";
export type { InsertUncheckedParams } from "../../../types/queries/items/InsertUnchecked.js";
import type * as pgsid from "./pgsid/queryable.js";
export const insertUncheckedSql = "INSERT INTO items (payload, unchecked) VALUES ('{\"actor\":1}', $1);";
export async function insertUnchecked(db: pgsid.Queryable, params: InsertUncheckedParams): Promise<void> {
    const jsonInput1 = params["payload"] === null ? null : JSON.stringify(params["payload"]);
    await db.query(insertUncheckedSql, [jsonInput1]);
}
