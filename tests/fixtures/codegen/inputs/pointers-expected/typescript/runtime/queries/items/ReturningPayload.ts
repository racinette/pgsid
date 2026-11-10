type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { ReturningPayloadParams, ReturningPayloadRow } from "../../../types/queries/items/ReturningPayload.js";
export type { ReturningPayloadParams, ReturningPayloadRow } from "../../../types/queries/items/ReturningPayload.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function jsonContainer(text: string, validate?: (value: unknown) => Error | null): PgsidJson<unknown> {
    let read: {
        value: unknown;
    } | {
        error: Error;
    } | undefined;
    const parsed = () => {
        if (!read)
            try {
                const value: unknown = JSON.parse(text);
                const error = validate?.(value) ?? null;
                read = error ? { error } : { value };
            }
            catch (error) {
                read = { error: error instanceof Error ? error : new Error(String(error)) };
            }
        return read;
    };
    return Object.assign(Object.create(null), {
        [Symbol.for("pgsid.json")]: true,
        text,
        value() {
            const result = parsed();
            if ("error" in result)
                throw result.error;
            return result.value;
        },
        safeValue() {
            const result = parsed();
            return "error" in result ? { ok: false, error: result.error } : { ok: true, value: result.value };
        },
    }) as PgsidJson<unknown>;
}
function isJson(value: unknown): value is PgsidJson<unknown> {
    return typeof value === "object" && value !== null && (value as Record<symbol, unknown>)[Symbol.for("pgsid.json")] === true && typeof (value as {
        text?: unknown;
    }).text === "string";
}
function decodeJson(value: string | null): unknown {
    return value === null ? null : jsonContainer(value);
}
function encodeJson(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (!isJson(value))
        return encodeInvalid(name, "JSON");
    return value.text;
}
function checkedJson(value: unknown, validate: (value: unknown) => Error | null): unknown {
    return isJson(value) ? jsonContainer(value.text, validate) : value;
}
export const returningPayloadSql = "UPDATE items SET payload = $1 RETURNING payload;";
export function isReturningPayloadPayload(value: unknown): value is NonNullable<ReturningPayloadRow["payload"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateReturningPayloadPayload(value: unknown): {
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
export function isReturningPayloadParamsPayloadPublicItemsPayload(value: unknown): value is NonNullable<ReturningPayloadParams["payload"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateReturningPayloadParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function returningPayload(db: pgsid.Queryable, params: ReturningPayloadParams): Promise<ReturningPayloadRow | undefined> {
    const jsonInput1 = encodeJson(params["payload"], "payload");
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isReturningPayloadParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("ReturningPayload", "payload", validateReturningPayloadParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    const result = await db.queryText(returningPayloadSql, [jsonInput1]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "payload": decodeJson(values[0]) };
    row["payload"] = checkedJson(row["payload"], (value: unknown) => isReturningPayloadPayload(value) ? null : new pgsid.QueryValidationError("ReturningPayload", "payload", validateReturningPayloadPayload(value).issues));
    return row as ReturningPayloadRow;
}
