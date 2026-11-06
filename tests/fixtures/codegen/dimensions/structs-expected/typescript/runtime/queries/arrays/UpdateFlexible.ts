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
function encodeArray(value: unknown, element: (item: unknown, name: string) => string | null, delimiter: string, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    const list = (items: unknown): string => {
        if (!Array.isArray(items))
            return encodeInvalid(name, "array");
        return "{" + items.map(item => {
            if (Array.isArray(item))
                return list(item);
            const text = element(item, name);
            return text === null ? "NULL" : "\"" + text.replace(/[\\"]/gu, "\\$&") + "\"";
        }).join(delimiter) + "}";
    };
    return list(value);
}
export const updateFlexibleSql = "UPDATE arrays SET flexible = $1, optional_flexible = $2 WHERE id = $3;";
export async function updateFlexible(db: pgsid.Queryable, params: UpdateFlexibleParams): Promise<number> {
    const result = await db.queryText(updateFlexibleSql, [encodeArray(params["flexible"], encodeInt, ",", "flexible"), encodeArray(params["optional"], encodeInt, ",", "optional"), encodeInt(params["id"], "id")]);
    return result.rowCount ?? 0;
}
