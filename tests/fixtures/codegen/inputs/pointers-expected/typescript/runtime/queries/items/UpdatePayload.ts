import type { UpdatePayloadParams } from "../../../types/queries/items/UpdatePayload.js";
export type { UpdatePayloadParams } from "../../../types/queries/items/UpdatePayload.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const updatePayloadSql = "UPDATE items SET payload = $1 WHERE id = $2;";
export function isUpdatePayloadParamsPayloadPublicItemsPayload(value: unknown): value is UpdatePayloadParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateUpdatePayloadParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function updatePayload(db: pgsid.Queryable, params: UpdatePayloadParams): Promise<number> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("UpdatePayload", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isUpdatePayloadParamsPayloadPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("UpdatePayload", "payload", validateUpdatePayloadParamsPayloadPublicItemsPayload(jsonInput1Value).issues);
    }
    const result = await db.query(updatePayloadSql, [jsonInput1, params["id"]]);
    return result.rowCount ?? 0;
}
