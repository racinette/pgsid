type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
export type InsertUncheckedParams = {
    "payload": PgsidJson<import("../../jsonschemas/index.js").Event> | null;
};
export type InsertUncheckedRow = {};
