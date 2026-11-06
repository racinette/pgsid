import type { WriteInCteParams, WriteInCteRow } from "../../../types/queries/items/WriteInCte.js";
export type { WriteInCteParams, WriteInCteRow } from "../../../types/queries/items/WriteInCte.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function decodeJson(value: string | null): unknown {
    return value === null ? null : JSON.parse(value);
}
function encodeJson(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    const text = JSON.stringify(value);
    if (text === undefined)
        return encodeInvalid(name, "JSON");
    return text;
}
export const writeInCteSql = "WITH written AS (INSERT INTO items (payload) VALUES ($1) RETURNING payload)\nSELECT payload FROM written;";
export function isWriteInCtePayload(value: unknown): value is WriteInCteRow["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateWriteInCtePayload(value: unknown): {
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
export function isWriteInCteParamsPayloadPublicItemsPayload(value: unknown): value is WriteInCteParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateWriteInCteParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function writeInCte(db: pgsid.Queryable, params: WriteInCteParams): Promise<WriteInCteRow | undefined> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("WriteInCte", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isWriteInCteParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("WriteInCte", "payload", validateWriteInCteParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    const result = await db.queryText(writeInCteSql, [jsonInput1]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "payload": decodeJson(values[0]) };
    if (!isWriteInCtePayload(row["payload"]))
        throw new pgsid.QueryValidationError("WriteInCte", "payload", validateWriteInCtePayload(row["payload"]).issues);
    return row as WriteInCteRow;
}
