import type { InsertMaybeParams } from "../../../types/queries/items/InsertMaybe.js";
export type { InsertMaybeParams } from "../../../types/queries/items/InsertMaybe.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const insertMaybeSql = "INSERT INTO items (payload, maybe) VALUES ('{\"actor\":1}', $1);";
export function isInsertMaybeParamsPayloadPublicItemsMaybe(value: unknown): value is InsertMaybeParams["payload"] {
    return _jsonSchemas.isMaybe(value);
}
export function validateInsertMaybeParamsPayloadPublicItemsMaybe(value: unknown): {
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
export async function insertMaybe(db: pgsid.Queryable, params: InsertMaybeParams): Promise<void> {
    const jsonInput1 = params["payload"] === null ? null : JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("InsertMaybe", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isInsertMaybeParamsPayloadPublicItemsMaybe(jsonInput1Value))
            throw new pgsid.QueryValidationError("InsertMaybe", "payload", validateInsertMaybeParamsPayloadPublicItemsMaybe(jsonInput1Value).issues);
    }
    await db.query(insertMaybeSql, [jsonInput1]);
}
