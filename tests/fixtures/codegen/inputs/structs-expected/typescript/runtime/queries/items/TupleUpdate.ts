import type { TupleUpdateParams } from "../../../types/queries/items/TupleUpdate.js";
export type { TupleUpdateParams } from "../../../types/queries/items/TupleUpdate.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const tupleUpdateSql = "UPDATE items SET (payload, unchecked) = ($1, $2);";
export function isTupleUpdateParamsFirstPublicItemsPayload(value: unknown): value is TupleUpdateParams["first"] {
    return _jsonSchemas.isEvent(value);
}
export function validateTupleUpdateParamsFirstPublicItemsPayload(value: unknown): {
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
export async function tupleUpdate(db: pgsid.Queryable, params: TupleUpdateParams): Promise<void> {
    const jsonInput1 = JSON.stringify(params["first"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("TupleUpdate", "first", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    const jsonInput2 = params["second"] === null ? null : JSON.stringify(params["second"]);
    if (jsonInput1 !== null) {
        if (!isTupleUpdateParamsFirstPublicItemsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("TupleUpdate", "first", validateTupleUpdateParamsFirstPublicItemsPayload(jsonInput1Value).issues);
    }
    await db.query(tupleUpdateSql, [jsonInput1, jsonInput2]);
}
