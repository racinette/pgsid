import type { SelectActorParams, SelectActorRow } from "../../../types/queries/items/SelectActor.js";
export type { SelectActorParams, SelectActorRow } from "../../../types/queries/items/SelectActor.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const selectActorSql = "SELECT payload -> 'actor' AS actor FROM items WHERE id = $1;";
export function isSelectActorActor(value: unknown): value is SelectActorRow["actor"] {
    return value === null || _jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].is(value);
}
export function validateSelectActorActor(value: unknown): {
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
export async function selectActor(db: pgsid.Queryable, params: SelectActorParams): Promise<SelectActorRow | undefined> {
    const result = await db.query(selectActorSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    if (!isSelectActorActor(row["actor"]))
        throw new pgsid.QueryValidationError("SelectActor", "actor", validateSelectActorActor(row["actor"]).issues);
    return row as SelectActorRow;
}
