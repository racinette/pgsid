export type UpdateEventParams = {
    "payload": import("../../jsonschemas/index.js").EventPayload;
    "note": string | null;
    "id": bigint | null;
};
export type UpdateEventRow = {
    "id": import("../../schema/public/domains.js").EventId;
    "payload": import("../../jsonschemas/index.js").EventPayload;
    "score": string | null;
    "note": string | null;
};
