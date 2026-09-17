import type { SelectActorFromCteParams, SelectActorFromCteRow } from "../../../types/queries/items/SelectActorFromCte.js";
export type { SelectActorFromCteParams, SelectActorFromCteRow } from "../../../types/queries/items/SelectActorFromCte.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const selectActorFromCteSql = "WITH source AS (SELECT payload FROM items WHERE id = $1),\nprojected AS (SELECT payload -> 'actor' AS actor FROM source)\nSELECT actor FROM projected;";
export function isSelectActorFromCteActor(value: unknown): value is SelectActorFromCteRow["actor"] {
    return value === null || _jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].is(value);
}
export function validateSelectActorFromCteActor(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return value === null ? { valid: true, issues: [] } : _jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].validate(value);
}
export async function selectActorFromCte(db: pgsid.Queryable, params: SelectActorFromCteParams): Promise<SelectActorFromCteRow | undefined> {
    const result = await db.query(selectActorFromCteSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    if (!isSelectActorFromCteActor(row["actor"]))
        throw new pgsid.QueryValidationError("SelectActorFromCte", "actor", validateSelectActorFromCteActor(row["actor"]).issues);
    return row as SelectActorFromCteRow;
}
