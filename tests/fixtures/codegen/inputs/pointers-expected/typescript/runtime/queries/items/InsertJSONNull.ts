import type { InsertJSONNullParams } from "../../../types/queries/items/InsertJSONNull.js";
export type { InsertJSONNullParams } from "../../../types/queries/items/InsertJSONNull.js";
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
export const insertJSONNullSql = "INSERT INTO items (payload, literal) VALUES ('{\"actor\":1}', $1);";
export function isInsertJSONNullParamsPayloadPublicItemsLiteral(value: unknown): value is InsertJSONNullParams["payload"] {
    return _jsonSchemas.isMaybe(value);
}
export function validateInsertJSONNullParamsPayloadPublicItemsLiteral(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.validateMaybe(value);
}
export async function insertJSONNull(db: pgsid.Queryable, params: InsertJSONNullParams): Promise<void> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("InsertJSONNull", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isInsertJSONNullParamsPayloadPublicItemsLiteral(jsonInput1Value))
            throw new pgsid.QueryValidationError("InsertJSONNull", "payload", validateInsertJSONNullParamsPayloadPublicItemsLiteral(jsonInput1Value).issues);
    }
    await db.queryText(insertJSONNullSql, [jsonInput1]);
}
