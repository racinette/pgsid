type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { MultipleSchemasParams } from "../../../types/queries/items/MultipleSchemas.js";
export type { MultipleSchemasParams } from "../../../types/queries/items/MultipleSchemas.js";
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
export const multipleSchemasSql = "INSERT INTO items (payload, audit) VALUES ($1, $1);";
export function isMultipleSchemasParamsPayloadPublicItemsPayload(value: unknown): value is NonNullable<MultipleSchemasParams["payload"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateMultipleSchemasParamsPayloadPublicItemsPayload(value: unknown): {
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
export function isMultipleSchemasParamsPayloadPublicItemsAudit(value: unknown): value is NonNullable<MultipleSchemasParams["payload"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isAudit(value);
}
export function validateMultipleSchemasParamsPayloadPublicItemsAudit(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.validateAudit(value);
}
export async function multipleSchemas(db: pgsid.Queryable, params: MultipleSchemasParams): Promise<void> {
    const jsonInput1 = encodeJson(params["payload"], "payload");
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isMultipleSchemasParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("MultipleSchemas", "payload", validateMultipleSchemasParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    if (jsonInput1 !== null) {
        if (!isMultipleSchemasParamsPayloadPublicItemsAudit(jsonInput1Value))
            throw new pgsid.QueryValidationError("MultipleSchemas", "payload", validateMultipleSchemasParamsPayloadPublicItemsAudit(jsonInput1Value).issues);
    }
    await db.queryText(multipleSchemasSql, [jsonInput1]);
}
