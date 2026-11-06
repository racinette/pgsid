import type { SelectActorFromCteParams, SelectActorFromCteRow } from "../../../types/queries/items/SelectActorFromCte.js";
export type { SelectActorFromCteParams, SelectActorFromCteRow } from "../../../types/queries/items/SelectActorFromCte.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function encodeInt(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "number" || !Number.isSafeInteger(value))
        return encodeInvalid(name, "integer");
    return String(value);
}
function decodeJson(value: string | null): unknown {
    return value === null ? null : JSON.parse(value);
}
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
    const result = await db.queryText(selectActorFromCteSql, [encodeInt(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "actor": decodeJson(values[0]) };
    if (!isSelectActorFromCteActor(row["actor"]))
        throw new pgsid.QueryValidationError("SelectActorFromCte", "actor", validateSelectActorFromCteActor(row["actor"]).issues);
    return row as SelectActorFromCteRow;
}
