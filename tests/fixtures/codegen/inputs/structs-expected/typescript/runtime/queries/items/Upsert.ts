import type { UpsertParams } from "../../../types/queries/items/Upsert.js";
export type { UpsertParams } from "../../../types/queries/items/Upsert.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const upsertSql = "INSERT INTO items (id, payload) VALUES ($1, $2)\nON CONFLICT (id) DO UPDATE SET payload = $3;";
export function isUpsertParamsFirstPublicItemsPayload(value: unknown): value is UpsertParams["first"] {
    return _jsonSchemas.isEvent(value);
}
export function validateUpsertParamsFirstPublicItemsPayload(value: unknown): {
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
export function isUpsertParamsSecondPublicItemsPayload(value: unknown): value is UpsertParams["second"] {
    return _jsonSchemas.isEvent(value);
}
export function validateUpsertParamsSecondPublicItemsPayload(value: unknown): {
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
export async function upsert(db: pgsid.Queryable, params: UpsertParams): Promise<void> {
    const jsonInput2 = JSON.stringify(params["first"]);
    if (jsonInput2 === undefined)
        throw new pgsid.QueryValidationError("Upsert", "first", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput2Value = jsonInput2 === null ? null : JSON.parse(jsonInput2);
    const jsonInput3 = JSON.stringify(params["second"]);
    if (jsonInput3 === undefined)
        throw new pgsid.QueryValidationError("Upsert", "second", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput3Value = jsonInput3 === null ? null : JSON.parse(jsonInput3);
    if (jsonInput2 !== null) {
        if (!isUpsertParamsFirstPublicItemsPayload(jsonInput2Value))
            throw new pgsid.QueryValidationError("Upsert", "first", validateUpsertParamsFirstPublicItemsPayload(jsonInput2Value).issues);
    }
    if (jsonInput3 !== null) {
        if (!isUpsertParamsSecondPublicItemsPayload(jsonInput3Value))
            throw new pgsid.QueryValidationError("Upsert", "second", validateUpsertParamsSecondPublicItemsPayload(jsonInput3Value).issues);
    }
    await db.query(upsertSql, [params["id"], jsonInput2, jsonInput3]);
}
