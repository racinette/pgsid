type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { CastJSONParams } from "../../../types/queries/items/CastJSON.js";
export type { CastJSONParams } from "../../../types/queries/items/CastJSON.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
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
export const castJSONSql = "INSERT INTO items (payload) VALUES ($1::json::jsonb);";
export function isCastJSONParamsPayloadPublicItemsPayload(value: unknown): value is NonNullable<CastJSONParams["payload"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateCastJSONParamsPayloadPublicItemsPayload(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.validateEvent(value);
}
export async function castJSON(db: pgsid.Queryable, params: CastJSONParams): Promise<void> {
    const jsonInput1 = encodeJson(params["payload"], "payload");
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isCastJSONParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("CastJSON", "payload", validateCastJSONParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    await db.queryText(castJSONSql, [jsonInput1]);
}
