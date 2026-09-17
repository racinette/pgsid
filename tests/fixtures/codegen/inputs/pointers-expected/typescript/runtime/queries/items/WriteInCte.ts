import type { WriteInCteParams, WriteInCteRow } from "../../../types/queries/items/WriteInCte.js";
export type { WriteInCteParams, WriteInCteRow } from "../../../types/queries/items/WriteInCte.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const writeInCteSql = "WITH written AS (INSERT INTO items (payload) VALUES ($1) RETURNING payload)\nSELECT payload FROM written;";
export function isWriteInCtePayload(value: unknown): value is WriteInCteRow["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateWriteInCtePayload(value: unknown): {
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
export function isWriteInCteParamsPayloadPublicItemsPayload(value: unknown): value is WriteInCteParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateWriteInCteParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function writeInCte(db: pgsid.Queryable, params: WriteInCteParams): Promise<WriteInCteRow | undefined> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("WriteInCte", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isWriteInCteParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("WriteInCte", "payload", validateWriteInCteParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    const result = await db.query(writeInCteSql, [jsonInput1]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    if (!isWriteInCtePayload(row["payload"]))
        throw new pgsid.QueryValidationError("WriteInCte", "payload", validateWriteInCtePayload(row["payload"]).issues);
    return row as WriteInCteRow;
}
