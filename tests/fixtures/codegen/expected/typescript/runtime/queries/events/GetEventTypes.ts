import type { GetEventTypesParams, GetEventTypesRow } from "../../../types/queries/events/GetEventTypes.js";
export type { GetEventTypesParams, GetEventTypesRow } from "../../../types/queries/events/GetEventTypes.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function decodeInt(value: string | null): number | null {
    return value === null ? null : Number(value);
}
function decodeBigint(value: string | null): bigint | null {
    return value === null ? null : BigInt(value);
}
function encodeBigint(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "bigint")
        return encodeInvalid(name, "bigint");
    return String(value);
}
function decodeText(value: string | null): string | null {
    return value;
}
function arrayDimensionError(depth: number, dimensions: readonly number[], setting: string): never {
    throw new Error("The server returned an array of " + depth + " dimensions where " + setting + " allows " + dimensions.join(" or "));
}
function decodeArray(value: string | null, element: (item: string | null) => unknown, delimiter: string, dimensions: readonly number[], setting: string): unknown {
    if (value === null)
        return null;
    let index = value.startsWith("[") ? value.indexOf("=") + 1 : 0;
    let depth = 0;
    while (value[index + depth] === "{")
        depth++;
    if (value[index + depth] === "}" && depth === 1)
        depth = 0;
    if (depth && !dimensions.includes(depth))
        arrayDimensionError(depth, dimensions, setting);
    const list = (): unknown[] => {
        index++;
        const items: unknown[] = [];
        if (value[index] === "}") {
            index++;
            return items;
        }
        for (;;) {
            if (value[index] === "{")
                items.push(list());
            else if (value[index] === "\"") {
                let text = "";
                for (index++; value[index] !== "\""; index++)
                    text += value[index] === "\\" ? value[++index] : value[index];
                index++;
                items.push(element(text));
            }
            else {
                const start = index;
                while (value[index] !== delimiter && value[index] !== "}")
                    index++;
                const text = value.slice(start, index);
                items.push(element(text === "NULL" ? null : text));
            }
            if (value[index++] === "}")
                return items;
        }
    };
    const elements = list();
    return dimensions.length === 1 ? elements : { dimensions: depth || dimensions[0], elements };
}
export const getEventTypesSql = "SELECT id, default_id, state, states, ARRAY[1, NULL]::int4[] AS numbers\nFROM public.events WHERE id = $1;";
export async function getEventTypes(db: pgsid.Queryable, params: GetEventTypesParams): Promise<GetEventTypesRow | undefined> {
    const result = await db.queryText(getEventTypesSql, [encodeBigint(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "id": decodeBigint(values[0]), "default_id": decodeBigint(values[1]), "state": decodeText(values[2]), "states": decodeArray(values[3], decodeText, ",", [1], "the default of one array dimension"), "numbers": decodeArray(values[4], decodeInt, ",", [1], "the default of one array dimension") };
    return row as GetEventTypesRow;
}
