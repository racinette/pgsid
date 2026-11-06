import type { UpdateEventParams, UpdateEventRow } from "../../../types/queries/events/UpdateEvent.js";
export type { UpdateEventParams, UpdateEventRow } from "../../../types/queries/events/UpdateEvent.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function decodeBigint(value: string | null): bigint | null {
    return value === null ? null : BigInt(value);
}
function encodeBigint(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "bigint")
        return encodeInvalid(name, "bigint");
    return String(value);
}
function decodeText(value: string | null): string | null {
    return value;
}
function encodeText(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "string")
        return encodeInvalid(name, "text");
    return value;
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
export const updateEventSql = "UPDATE public.events\nSET payload = $1, note = $2\nWHERE id = $3\nRETURNING id, payload, payload ->> 'score' AS score, note;";
export function isUpdateEventPayload(value: unknown): value is UpdateEventRow["payload"] {
    return _jsonSchemas.isEventPayload(value);
}
export function validateUpdateEventPayload(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.validateEventPayload(value);
}
export function isUpdateEventScore(value: unknown): value is UpdateEventRow["score"] {
    return value === null || typeof value === "string";
}
export function validateUpdateEventScore(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    const _issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[] = [];
    const valid = value === null || _jsonSchemas.jsonSchemaHelpers._check(typeof value === "string", value, [], "type", "string", _issues);
    return { valid, issues: _issues };
}
export function isUpdateEventParamsPayloadPublicEventsPayload(value: unknown): value is UpdateEventParams["payload"] {
    return _jsonSchemas.isEventPayload(value);
}
export function validateUpdateEventParamsPayloadPublicEventsPayload(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.validateEventPayload(value);
}
export async function updateEvent(db: pgsid.Queryable, params: UpdateEventParams): Promise<UpdateEventRow | undefined> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("UpdateEvent", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isUpdateEventParamsPayloadPublicEventsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("UpdateEvent", "payload", validateUpdateEventParamsPayloadPublicEventsPayload(jsonInput1Value).issues);
    }
    const result = await db.queryText(updateEventSql, [jsonInput1, encodeText(params["note"], "note"), encodeBigint(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "id": decodeBigint(values[0]), "payload": decodeJson(values[1]), "score": decodeText(values[2]), "note": decodeText(values[3]) };
    if (!isUpdateEventPayload(row["payload"]))
        throw new pgsid.QueryValidationError("UpdateEvent", "payload", validateUpdateEventPayload(row["payload"]).issues);
    if (!isUpdateEventScore(row["score"]))
        throw new pgsid.QueryValidationError("UpdateEvent", "score", validateUpdateEventScore(row["score"]).issues);
    return row as UpdateEventRow;
}
