import type { ReturningManyParams, ReturningManyRow } from "../../../types/queries/items/ReturningMany.js";
export type { ReturningManyParams, ReturningManyRow } from "../../../types/queries/items/ReturningMany.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const returningManySql = "UPDATE items SET payload = $1 RETURNING payload;";
export function isReturningManyPayload(value: unknown): value is ReturningManyRow["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateReturningManyPayload(value: unknown): {
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
export function isReturningManyParamsPayloadPublicItemsPayload(value: unknown): value is ReturningManyParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateReturningManyParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function returningMany(db: pgsid.Queryable, params: ReturningManyParams): Promise<ReturningManyRow[]> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("ReturningMany", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isReturningManyParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("ReturningMany", "payload", validateReturningManyParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    const result = await db.query(returningManySql, [jsonInput1]);
    return result.rows.map(row => {
        if (!isReturningManyPayload(row["payload"]))
            throw new pgsid.QueryValidationError("ReturningMany", "payload", validateReturningManyPayload(row["payload"]).issues);
        return row as ReturningManyRow;
    });
}
