import type { InsertUncheckedParams } from "../../../types/queries/items/InsertUnchecked.js";
export type { InsertUncheckedParams } from "../../../types/queries/items/InsertUnchecked.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function encodeJson(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    const text = JSON.stringify(value);
    if (text === undefined)
        return encodeInvalid(name, "JSON");
    return text;
}
export const insertUncheckedSql = "INSERT INTO items (payload, unchecked) VALUES ('{\"actor\":1}', $1);";
export async function insertUnchecked(db: pgsid.Queryable, params: InsertUncheckedParams): Promise<void> {
    const jsonInput1 = params["payload"] === null ? null : JSON.stringify(params["payload"]);
    await db.queryText(insertUncheckedSql, [jsonInput1]);
}
