type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { TupleUpdateParams } from "../../../types/queries/items/TupleUpdate.js";
export type { TupleUpdateParams } from "../../../types/queries/items/TupleUpdate.js";
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
export const tupleUpdateSql = "UPDATE items SET (payload, unchecked) = ($1, $2);";
export function isTupleUpdateParamsFirstPublicItemsPayload(value: unknown): value is NonNullable<TupleUpdateParams["first"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEvent(value);
}
export function validateTupleUpdateParamsFirstPublicItemsPayload(value: unknown): {
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
export async function tupleUpdate(db: pgsid.Queryable, params: TupleUpdateParams): Promise<void> {
    const jsonInput1 = encodeJson(params["first"], "first");
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    const jsonInput2 = params["second"] === null ? null : encodeJson(params["second"], "second");
    if (jsonInput1 !== null) {
        if (!isTupleUpdateParamsFirstPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("TupleUpdate", "first", validateTupleUpdateParamsFirstPublicItemsPayload(jsonInput1Value).issues);
    }
    await db.queryText(tupleUpdateSql, [jsonInput1, jsonInput2]);
}
