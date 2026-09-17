import type { InsertFromCteParams } from "../../../types/queries/items/InsertFromCte.js";
export type { InsertFromCteParams } from "../../../types/queries/items/InsertFromCte.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const insertFromCteSql = "WITH a AS (SELECT $1::jsonb AS payload), b AS (SELECT payload FROM a)\nINSERT INTO items (payload) SELECT payload FROM b;";
export function isInsertFromCteParamsPayloadPublicItemsPayload(value: unknown): value is InsertFromCteParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateInsertFromCteParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function insertFromCte(db: pgsid.Queryable, params: InsertFromCteParams): Promise<void> {
    const jsonInput1 = params["payload"] === null ? null : JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("InsertFromCte", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isInsertFromCteParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("InsertFromCte", "payload", validateInsertFromCteParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    await db.query(insertFromCteSql, [jsonInput1]);
}
