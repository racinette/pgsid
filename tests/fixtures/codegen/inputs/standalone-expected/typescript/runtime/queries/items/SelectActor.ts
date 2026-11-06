import type { SelectActorParams, SelectActorRow } from "../../../types/queries/items/SelectActor.js";
export type { SelectActorParams, SelectActorRow } from "../../../types/queries/items/SelectActor.js";
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
    const result = await db.queryText(selectActorSql, [encodeInt(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "actor": decodeJson(values[0]) };
    if (!isSelectActorActor(row["actor"]))
        throw new pgsid.QueryValidationError("SelectActor", "actor", validateSelectActorActor(row["actor"]).issues);
    return row as SelectActorRow;
}
