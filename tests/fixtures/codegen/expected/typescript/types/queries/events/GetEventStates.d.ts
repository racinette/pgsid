export type GetEventStatesParams = {
    "id": bigint | null;
};
export type GetEventStatesRow = {
    "states": (import("../../schema/public/enums.js").EventState | null)[] | null;
};
