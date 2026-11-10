type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { InsertManyParams } from "../../../types/queries/items/InsertMany.js";
export type { InsertManyParams } from "../../../types/queries/items/InsertMany.js";
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
export const insertManySql = "INSERT INTO items (payload) VALUES ($1), ($2);";
export function isInsertManyParamsFirstPublicItemsPayload(value: unknown): value is NonNullable<InsertManyParams["first"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateInsertManyParamsFirstPublicItemsPayload(value: unknown): {
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
export function isInsertManyParamsSecondPublicItemsPayload(value: unknown): value is NonNullable<InsertManyParams["second"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateInsertManyParamsSecondPublicItemsPayload(value: unknown): {
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
export async function insertMany(db: pgsid.Queryable, params: InsertManyParams): Promise<void> {
    const jsonInput1 = encodeJson(params["first"], "first");
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    const jsonInput2 = encodeJson(params["second"], "second");
    const jsonInput2Value = jsonInput2 === null ? null : JSON.parse(jsonInput2);
    if (jsonInput1 !== null) {
        if (!isInsertManyParamsFirstPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("InsertMany", "first", validateInsertManyParamsFirstPublicItemsPayload(jsonInput1Value).issues);
    }
    if (jsonInput2 !== null) {
        if (!isInsertManyParamsSecondPublicItemsPayload(jsonInput2Value))
            throw new pgsid.QueryValidationError("InsertMany", "second", validateInsertManyParamsSecondPublicItemsPayload(jsonInput2Value).issues);
    }
    await db.queryText(insertManySql, [jsonInput1, jsonInput2]);
}
