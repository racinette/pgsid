import type { UpdatePayloadParams } from "../../../types/queries/items/UpdatePayload.js";
export type { UpdatePayloadParams } from "../../../types/queries/items/UpdatePayload.js";
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
function encodeJson(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    const text = JSON.stringify(value);
    if (text === undefined)
        return encodeInvalid(name, "JSON");
    return text;
}
export const updatePayloadSql = "UPDATE items SET payload = $1 WHERE id = $2;";
export function isUpdatePayloadParamsPayloadPublicItemsPayload(value: unknown): value is UpdatePayloadParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateUpdatePayloadParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function updatePayload(db: pgsid.Queryable, params: UpdatePayloadParams): Promise<number> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("UpdatePayload", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isUpdatePayloadParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("UpdatePayload", "payload", validateUpdatePayloadParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    const result = await db.queryText(updatePayloadSql, [jsonInput1, encodeInt(params["id"], "id")]);
    return result.rowCount ?? 0;
}
