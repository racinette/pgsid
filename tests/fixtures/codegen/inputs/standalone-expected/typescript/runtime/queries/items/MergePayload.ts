import type { MergePayloadParams } from "../../../types/queries/items/MergePayload.js";
export type { MergePayloadParams } from "../../../types/queries/items/MergePayload.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const mergePayloadSql = "MERGE INTO items USING (SELECT $1::integer AS id, $2::jsonb AS payload) AS source\nON items.id = source.id\nWHEN MATCHED THEN UPDATE SET payload = source.payload\nWHEN NOT MATCHED THEN INSERT (id, payload) VALUES (source.id, source.payload);";
export function isMergePayloadParamsPayloadPublicItemsPayload(value: unknown): value is MergePayloadParams["payload"] {
    return _jsonSchemas.isEvent(value);
}
export function validateMergePayloadParamsPayloadPublicItemsPayload(value: unknown): {
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
export async function mergePayload(db: pgsid.Queryable, params: MergePayloadParams): Promise<void> {
    const jsonInput2 = JSON.stringify(params["payload"]);
    if (jsonInput2 === undefined)
        throw new pgsid.QueryValidationError("MergePayload", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput2Value = jsonInput2 === null ? null : JSON.parse(jsonInput2);
    if (jsonInput2 !== null) {
        if (!isMergePayloadParamsPayloadPublicItemsPayload(jsonInput2Value))
            throw new pgsid.QueryValidationError("MergePayload", "payload", validateMergePayloadParamsPayloadPublicItemsPayload(jsonInput2Value).issues);
    }
    await db.query(mergePayloadSql, [params["id"], jsonInput2]);
}
