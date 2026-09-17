import type { InsertArrayParams } from "../../../types/queries/items/InsertArray.js";
export type { InsertArrayParams } from "../../../types/queries/items/InsertArray.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const insertArraySql = "INSERT INTO items (payload, numbers) VALUES ('{\"actor\":1}', $1);";
export function isInsertArrayParamsPayloadPublicItemsNumbers(value: unknown): value is InsertArrayParams["payload"] {
    return _jsonSchemas.isNumbers(value);
}
export function validateInsertArrayParamsPayloadPublicItemsNumbers(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.validateNumbers(value);
}
export async function insertArray(db: pgsid.Queryable, params: InsertArrayParams): Promise<void> {
    const jsonInput1 = params["payload"] === null ? null : JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("InsertArray", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isInsertArrayParamsPayloadPublicItemsNumbers(jsonInput1Value))
            throw new pgsid.QueryValidationError("InsertArray", "payload", validateInsertArrayParamsPayloadPublicItemsNumbers(jsonInput1Value).issues);
    }
    await db.query(insertArraySql, [jsonInput1]);
}
