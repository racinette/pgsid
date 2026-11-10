type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { UpsertParams } from "../../../types/queries/items/Upsert.js";
export type { UpsertParams } from "../../../types/queries/items/Upsert.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function encodeInt(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "number" || !Number.isSafeInteger(value))
        return encodeInvalid(name, "integer");
    return String(value);
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
export const upsertSql = "INSERT INTO items (id, payload) VALUES ($1, $2)\nON CONFLICT (id) DO UPDATE SET payload = $3;";
export function isUpsertParamsFirstPublicItemsPayload(value: unknown): value is NonNullable<UpsertParams["first"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateUpsertParamsFirstPublicItemsPayload(value: unknown): {
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
export function isUpsertParamsSecondPublicItemsPayload(value: unknown): value is NonNullable<UpsertParams["second"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateUpsertParamsSecondPublicItemsPayload(value: unknown): {
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
export async function upsert(db: pgsid.Queryable, params: UpsertParams): Promise<void> {
    const jsonInput2 = encodeJson(params["first"], "first");
    const jsonInput2Value = jsonInput2 === null ? null : JSON.parse(jsonInput2);
    const jsonInput3 = encodeJson(params["second"], "second");
    const jsonInput3Value = jsonInput3 === null ? null : JSON.parse(jsonInput3);
    if (jsonInput2 !== null) {
        if (!isUpsertParamsFirstPublicItemsPayload(jsonInput2Value))
            throw new pgsid.QueryValidationError("Upsert", "first", validateUpsertParamsFirstPublicItemsPayload(jsonInput2Value).issues);
    }
    if (jsonInput3 !== null) {
        if (!isUpsertParamsSecondPublicItemsPayload(jsonInput3Value))
            throw new pgsid.QueryValidationError("Upsert", "second", validateUpsertParamsSecondPublicItemsPayload(jsonInput3Value).issues);
    }
    await db.queryText(upsertSql, [encodeInt(params["id"], "id"), jsonInput2, jsonInput3]);
}
