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
    "payload": import("../../jsonschemas/index.js").EventPayload;
    "audit": import("../../jsonschemas/index.js").EventAudit | null;
    "metadata": unknown;
    "note": string | null;
    "created_at": Date;
}, {
    "id": import("./domains.js").EventId;
    "default_id"?: import("./domains.js").DefaultEventId;
    "account_id"?: bigint | null;
    "state"?: import("./enums.js").EventState;
    "states"?: (import("./enums.js").EventState | null)[] | null;
    "payload": import("../../jsonschemas/index.js").EventPayload;
    "audit"?: import("../../jsonschemas/index.js").EventAudit | null;
    "metadata"?: unknown;
    "note"?: string | null;
    "created_at"?: Date;
}, {
    "id"?: import("./domains.js").EventId;
    "default_id"?: import("./domains.js").DefaultEventId;
    "account_id"?: bigint | null;
    "state"?: import("./enums.js").EventState;
    "states"?: (import("./enums.js").EventState | null)[] | null;
    "payload"?: import("../../jsonschemas/index.js").EventPayload;
    "audit"?: import("../../jsonschemas/index.js").EventAudit | null;
    "metadata"?: unknown;
    "note"?: string | null;
    "created_at"?: Date;
}>;
export type EventDetails = TableTypes<{
    "id": import("./domains.js").EventId;
    "actor": import("../../jsonschemas/index.js").EventPayloadActor | null;
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
