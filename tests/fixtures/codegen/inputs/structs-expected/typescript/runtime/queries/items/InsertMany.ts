import type { InsertManyParams } from "../../../types/queries/items/InsertMany.js";
export type { InsertManyParams } from "../../../types/queries/items/InsertMany.js";
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
export const insertManySql = "INSERT INTO items (payload) VALUES ($1), ($2);";
export function isInsertManyParamsFirstPublicItemsPayload(value: unknown): value is InsertManyParams["first"] {
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
export function isInsertManyParamsSecondPublicItemsPayload(value: unknown): value is InsertManyParams["second"] {
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
    const jsonInput1 = JSON.stringify(params["first"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("InsertMany", "first", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    const jsonInput2 = JSON.stringify(params["second"]);
    if (jsonInput2 === undefined)
        throw new pgsid.QueryValidationError("InsertMany", "second", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
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
