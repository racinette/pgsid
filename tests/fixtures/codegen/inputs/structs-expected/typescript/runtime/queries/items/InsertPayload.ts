import type { InsertPayloadParams } from "../../../types/queries/items/InsertPayload.js";
export type { InsertPayloadParams } from "../../../types/queries/items/InsertPayload.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function encodeJson(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    const text = JSON.stringify(value);
    if (text === undefined)
        return encodeInvalid(name, "JSON");
    return text;
}
export const insertPayloadSql = "INSERT INTO items (payload) VALUES ($1);";
export function isInsertPayloadParamsPayloadPublicItemsPayload(value: unknown): value is InsertPayloadParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateInsertPayloadParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function insertPayload(db: pgsid.Queryable, params: InsertPayloadParams): Promise<void> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("InsertPayload", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isInsertPayloadParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("InsertPayload", "payload", validateInsertPayloadParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    await db.queryText(insertPayloadSql, [jsonInput1]);
}
