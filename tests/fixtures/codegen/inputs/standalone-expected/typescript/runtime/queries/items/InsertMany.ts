import type { InsertManyParams } from "../../../types/queries/items/InsertMany.js";
export type { InsertManyParams } from "../../../types/queries/items/InsertMany.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
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
    await db.query(insertManySql, [jsonInput1, jsonInput2]);
}
