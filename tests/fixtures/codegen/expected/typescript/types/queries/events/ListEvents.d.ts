export type ListEventsParams = readonly [
];
export type ListEventsRow = {
    "id": import("../../schema/public/domains.js").EventId;
    "payload": import("../../jsonschemas/index.js").EventPayload;
    "note": string | null;
};
