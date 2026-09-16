import type { TableTypes } from "../helpers.js";
export type Events = TableTypes<{
    "id": import("./domains.js").EventId;
}, {
    "id": import("./domains.js").EventId;
}, {
    "id"?: import("./domains.js").EventId;
}>;
