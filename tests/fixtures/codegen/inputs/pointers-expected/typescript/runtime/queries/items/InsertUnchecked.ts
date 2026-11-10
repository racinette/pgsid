type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { InsertUncheckedParams } from "../../../types/queries/items/InsertUnchecked.js";
export type { InsertUncheckedParams } from "../../../types/queries/items/InsertUnchecked.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function isJson(value: unknown): value is PgsidJson<unknown> {
    return typeof value === "object" && value !== null && (value as Record<symbol, unknown>)[Symbol.for("pgsid.json")] === true && typeof (value as {
        text?: unknown;
    }).text === "string";
}
function encodeJson(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (!isJson(value))
        return encodeInvalid(name, "JSON");
    return value.text;
}
export const insertUncheckedSql = "INSERT INTO items (payload, unchecked) VALUES ('{\"actor\":1}', $1);";
export async function insertUnchecked(db: pgsid.Queryable, params: InsertUncheckedParams): Promise<void> {
    const jsonInput1 = params["payload"] === null ? null : encodeJson(params["payload"], "payload");
    await db.queryText(insertUncheckedSql, [jsonInput1]);
}
