import type { MultipleSchemasParams } from "../../../types/queries/items/MultipleSchemas.js";
export type { MultipleSchemasParams } from "../../../types/queries/items/MultipleSchemas.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const multipleSchemasSql = "INSERT INTO items (payload, audit) VALUES ($1, $1);";
export function isMultipleSchemasParamsPayloadPublicItemsPayload(value: unknown): value is MultipleSchemasParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateMultipleSchemasParamsPayloadPublicItemsPayload(value: unknown): {
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
export function isMultipleSchemasParamsPayloadPublicItemsAudit(value: unknown): value is MultipleSchemasParams["payload"] {
    return _jsonSchemas.isAudit(value);
}
export function validateMultipleSchemasParamsPayloadPublicItemsAudit(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.validateAudit(value);
}
export async function multipleSchemas(db: pgsid.Queryable, params: MultipleSchemasParams): Promise<void> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("MultipleSchemas", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isMultipleSchemasParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("MultipleSchemas", "payload", validateMultipleSchemasParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    if (jsonInput1 !== null) {
        if (!isMultipleSchemasParamsPayloadPublicItemsAudit(jsonInput1Value))
            throw new pgsid.QueryValidationError("MultipleSchemas", "payload", validateMultipleSchemasParamsPayloadPublicItemsAudit(jsonInput1Value).issues);
    }
    await db.query(multipleSchemasSql, [jsonInput1]);
}
