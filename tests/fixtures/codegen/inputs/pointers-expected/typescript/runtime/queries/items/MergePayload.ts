type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { MergePayloadParams } from "../../../types/queries/items/MergePayload.js";
export type { MergePayloadParams } from "../../../types/queries/items/MergePayload.js";
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
export const mergePayloadSql = "MERGE INTO items USING (SELECT $1::integer AS id, $2::jsonb AS payload) AS source\nON items.id = source.id\nWHEN MATCHED THEN UPDATE SET payload = source.payload\nWHEN NOT MATCHED THEN INSERT (id, payload) VALUES (source.id, source.payload);";
export function isMergePayloadParamsPayloadPublicItemsPayload(value: unknown): value is NonNullable<MergePayloadParams["payload"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateMergePayloadParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function mergePayload(db: pgsid.Queryable, params: MergePayloadParams): Promise<void> {
    const jsonInput2 = encodeJson(params["payload"], "payload");
    const jsonInput2Value = jsonInput2 === null ? null : JSON.parse(jsonInput2);
    if (jsonInput2 !== null) {
        if (!isMergePayloadParamsPayloadPublicItemsPayload(jsonInput2Value))
            throw new pgsid.QueryValidationError("MergePayload", "payload", validateMergePayloadParamsPayloadPublicItemsPayload(jsonInput2Value).issues);
    }
    await db.queryText(mergePayloadSql, [encodeInt(params["id"], "id"), jsonInput2]);
}
