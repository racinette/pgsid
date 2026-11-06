import type { GetEventStatesParams, GetEventStatesRow } from "../../../types/queries/events/GetEventStates.js";
export type { GetEventStatesParams, GetEventStatesRow } from "../../../types/queries/events/GetEventStates.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
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
function decodeArray(value: string | null, element: (item: string | null) => unknown, delimiter: string): unknown {
    if (value === null)
        return null;
    let index = value.startsWith("[") ? value.indexOf("=") + 1 : 0;
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
    return list();
}
export const getEventStatesSql = "SELECT states FROM public.events WHERE id = $1;";
export async function getEventStates(db: pgsid.Queryable, params: GetEventStatesParams): Promise<GetEventStatesRow | undefined> {
    const result = await db.queryText(getEventStatesSql, [encodeBigint(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "states": decodeArray(values[0], decodeText, ",") };
    return row as GetEventStatesRow;
}
