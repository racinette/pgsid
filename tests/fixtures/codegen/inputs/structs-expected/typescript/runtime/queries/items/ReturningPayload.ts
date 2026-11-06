import type { ReturningPayloadParams, ReturningPayloadRow } from "../../../types/queries/items/ReturningPayload.js";
export type { ReturningPayloadParams, ReturningPayloadRow } from "../../../types/queries/items/ReturningPayload.js";
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
export const returningPayloadSql = "UPDATE items SET payload = $1 RETURNING payload;";
export function isReturningPayloadPayload(value: unknown): value is ReturningPayloadRow["payload"] {
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
export function isReturningPayloadParamsPayloadPublicItemsPayload(value: unknown): value is ReturningPayloadParams["payload"] {
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
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("ReturningPayload", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
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
    if (!isReturningPayloadPayload(row["payload"]))
        throw new pgsid.QueryValidationError("ReturningPayload", "payload", validateReturningPayloadPayload(row["payload"]).issues);
    return row as ReturningPayloadRow;
}
