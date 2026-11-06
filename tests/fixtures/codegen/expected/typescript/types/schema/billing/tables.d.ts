import type { TableTypes } from "../helpers.js";
export type Events = TableTypes<{
    "id": import("./domains.js").EventId;
    "source_id": import("../public/domains.js").EventId;
    "state": import("./enums.js").EventState;
    "metadata": string | null;
}, {
    "id": import("./domains.js").EventId;
    "source_id": import("../public/domains.js").EventId;
    "state": import("./enums.js").EventState;
    "metadata"?: string | null;
}, {
    "id"?: import("./domains.js").EventId;
    "source_id"?: import("../public/domains.js").EventId;
    "state"?: import("./enums.js").EventState;
    "metadata"?: string | null;
}>;
