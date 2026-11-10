type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
export type ListEventsParams = readonly [
];
export type ListEventsRow = {
    "id": import("../../schema/public/domains.js").EventId;
    "payload": PgsidJson<import("../../jsonschemas/index.js").EventPayload>;
    "note": string | null;
};
