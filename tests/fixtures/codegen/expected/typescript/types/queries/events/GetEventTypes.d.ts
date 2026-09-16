export type GetEventTypesParams = {
    "id": bigint | null;
};
export type GetEventTypesRow = {
    "id": import("../../schema/public/domains.js").EventId;
    "default_id": import("../../schema/public/domains.js").DefaultEventId | null;
    "state": import("../../schema/public/enums.js").EventState;
    "states": (import("../../schema/public/enums.js").EventState | null)[] | null;
    "numbers": (number | null)[];
};
