export type GetBillingEventParams = {
    "id": bigint | null;
};
export type GetBillingEventRow = {
    "id": import("../../schema/billing/domains.js").EventId;
    "source_id": import("../../schema/public/domains.js").EventId;
    "state": import("../../schema/billing/enums.js").EventState;
};
