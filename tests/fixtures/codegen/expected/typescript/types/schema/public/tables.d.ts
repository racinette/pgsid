type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { TableTypes } from "../helpers.js";
export type Accounts = TableTypes<{
    "id": bigint;
    "display_name": string;
}, {
    "display_name": string;
}, {
    "display_name"?: string;
}>;
export type Events = TableTypes<{
    "id": import("./domains.js").EventId;
    "default_id": import("./domains.js").DefaultEventId;
    "account_id": bigint | null;
    "state": import("./enums.js").EventState;
    "states": (import("./enums.js").EventState | null)[] | null;
    "payload": PgsidJson<import("../../jsonschemas/index.js").EventPayload>;
    "audit": PgsidJson<import("../../jsonschemas/index.js").EventAudit> | null;
    "metadata": {
        readonly "source": string | null;
        readonly "confidence": string | null;
    } | null;
    "note": string | null;
    "created_at": {
        readonly epochMicroseconds: bigint;
    } | {
        readonly infinity: 1 | -1;
    };
}, {
    "id": import("./domains.js").EventId;
    "default_id"?: import("./domains.js").DefaultEventId;
    "account_id"?: bigint | null;
    "state"?: import("./enums.js").EventState;
    "states"?: (import("./enums.js").EventState | null)[] | null;
    "payload": PgsidJson<import("../../jsonschemas/index.js").EventPayload>;
    "audit"?: PgsidJson<import("../../jsonschemas/index.js").EventAudit> | null;
    "metadata"?: {
        readonly "source": string | null;
        readonly "confidence": string | null;
    } | null;
    "note"?: string | null;
    "created_at"?: {
        readonly epochMicroseconds: bigint;
    } | {
        readonly infinity: 1 | -1;
    };
}, {
    "id"?: import("./domains.js").EventId;
    "default_id"?: import("./domains.js").DefaultEventId;
    "account_id"?: bigint | null;
    "state"?: import("./enums.js").EventState;
    "states"?: (import("./enums.js").EventState | null)[] | null;
    "payload"?: PgsidJson<import("../../jsonschemas/index.js").EventPayload>;
    "audit"?: PgsidJson<import("../../jsonschemas/index.js").EventAudit> | null;
    "metadata"?: {
        readonly "source": string | null;
        readonly "confidence": string | null;
    } | null;
    "note"?: string | null;
    "created_at"?: {
        readonly epochMicroseconds: bigint;
    } | {
        readonly infinity: 1 | -1;
    };
}>;
export type EventDetails = TableTypes<{
    "id": import("./domains.js").EventId;
    "actor": PgsidJson<import("../../jsonschemas/index.js").EventPayloadActor> | null;
    "account_id": bigint | null;
    "display_name": string | null;
} & ({
    "account_id": bigint;
    "display_name": string;
} | {
    "account_id": null;
    "display_name": null;
}), never, never>;
export type EventTotals = TableTypes<{
    "state": import("./enums.js").EventState;
    "total": bigint;
}, never, never>;
