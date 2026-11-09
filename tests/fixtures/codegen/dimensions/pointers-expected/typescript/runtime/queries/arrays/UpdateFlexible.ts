import type { UpdateFlexibleParams } from "../../../types/queries/arrays/UpdateFlexible.js";
export type { UpdateFlexibleParams } from "../../../types/queries/arrays/UpdateFlexible.js";
import type * as pgsid from "./pgsid/queryable.js";
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
function encodeArray(value: unknown, element: (item: unknown, name: string) => string | null, delimiter: string, dimensions: readonly number[], name: string): string | null {
    if (value === null || value === undefined)
        return null;
    let depth = dimensions[0]!;
    if (dimensions.length > 1) {
        if (!value || typeof value !== "object" || !("dimensions" in value) || !("elements" in value) || typeof value.dimensions !== "number" || !dimensions.includes(value.dimensions))
            return encodeInvalid(name, "array");
        depth = value.dimensions;
        value = value.elements;
    }
    const list = (items: unknown, level: number): string => {
        if (!Array.isArray(items))
            return encodeInvalid(name, "array");
        return "{" + items.map(item => {
            if (level > 1)
                return list(item, level - 1);
            const text = item === null ? null : element(item, name);
            return text === null ? "NULL" : "\"" + text.replace(/[\\"]/gu, "\\$&") + "\"";
        }).join(delimiter) + "}";
    };
    return list(value, depth);
}
export const updateFlexibleSql = "UPDATE arrays SET flexible = $1, optional_flexible = $2 WHERE id = $3;";
export async function updateFlexible(db: pgsid.Queryable, params: UpdateFlexibleParams): Promise<number> {
    const result = await db.queryText(updateFlexibleSql, [encodeArray(params["flexible"], encodeInt, ",", [1, 2], "flexible"), encodeArray(params["optional"], encodeInt, ",", [1, 2], "optional"), encodeInt(params["id"], "id")]);
    return result.rowCount ?? 0;
}
