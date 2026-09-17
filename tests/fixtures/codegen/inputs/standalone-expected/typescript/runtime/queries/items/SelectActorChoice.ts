import type { SelectActorChoiceParams, SelectActorChoiceRow } from "../../../types/queries/items/SelectActorChoice.js";
export type { SelectActorChoiceParams, SelectActorChoiceRow } from "../../../types/queries/items/SelectActorChoice.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const selectActorChoiceSql = "SELECT CASE WHEN id > 0 THEN payload -> 'actor' ELSE audit -> 'actor' END AS actor\nFROM items WHERE id = $1;";
export function isSelectActorChoiceActor(value: unknown): value is SelectActorChoiceRow["actor"] {
    return value === null || (_jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].is(value) || _jsonSchemas.jsonSchemaValidators["Audit"]["/properties/actor"].is(value));
}
export function validateSelectActorChoiceActor(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    const _issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[] = [];
    const valid = value === null || _jsonSchemas.jsonSchemaHelpers._union([() => _jsonSchemas.jsonSchemaHelpers._include(_jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].validate(value), [], _issues), () => _jsonSchemas.jsonSchemaHelpers._include(_jsonSchemas.jsonSchemaValidators["Audit"]["/properties/actor"].validate(value), [], _issues)], value, [], "anyOf", _issues);
    return { valid, issues: _issues };
}
export async function selectActorChoice(db: pgsid.Queryable, params: SelectActorChoiceParams): Promise<SelectActorChoiceRow | undefined> {
    const result = await db.query(selectActorChoiceSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    if (!isSelectActorChoiceActor(row["actor"]))
        throw new pgsid.QueryValidationError("SelectActorChoice", "actor", validateSelectActorChoiceActor(row["actor"]).issues);
    return row as SelectActorChoiceRow;
}
