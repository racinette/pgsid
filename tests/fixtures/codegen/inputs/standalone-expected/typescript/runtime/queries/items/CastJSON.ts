import type { CastJSONParams } from "../../../types/queries/items/CastJSON.js";
export type { CastJSONParams } from "../../../types/queries/items/CastJSON.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const castJSONSql = "INSERT INTO items (payload) VALUES ($1::json::jsonb);";
export function isCastJSONParamsPayloadPublicItemsPayload(value: unknown): value is CastJSONParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateCastJSONParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function castJSON(db: pgsid.Queryable, params: CastJSONParams): Promise<void> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("CastJSON", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isCastJSONParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("CastJSON", "payload", validateCastJSONParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    await db.query(castJSONSql, [jsonInput1]);
}
