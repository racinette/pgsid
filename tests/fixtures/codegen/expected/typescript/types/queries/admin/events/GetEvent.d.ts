export type GetEventParams = {
    "id": bigint | null;
};
export type GetEventRow = {
    "id": import("../../../schema/billing/domains.js").EventId;
    "source_id": import("../../../schema/public/domains.js").EventId;
    "state": import("../../../schema/billing/enums.js").EventState;
    "metadata": unknown;
};
