type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
export type GetEventParams = {
    "id": bigint | null;
};
export type GetEventRow = {
    "id": import("../../schema/public/domains.js").EventId;
    "payload": PgsidJson<import("../../jsonschemas/index.js").EventPayload>;
    "actor": PgsidJson<import("../../jsonschemas/index.js").EventPayloadActor> | null;
    "state": import("../../schema/public/enums.js").EventState;
    "created_at": {
        readonly epochMicroseconds: bigint;
    } | {
        readonly infinity: 1 | -1;
    };
    "joined_account_id": bigint | null;
    "display_name": string | null;
} & ({
    "joined_account_id": bigint;
    "display_name": string;
} | {
    "joined_account_id": null;
    "display_name": null;
});
