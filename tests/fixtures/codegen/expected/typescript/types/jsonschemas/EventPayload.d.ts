export type EventPayload = {
    "actor": EventPayloadActor;
    "flags": EventPayloadFlags;
    "score"?: number | null;
    "next"?: EventPayload;
};
export type EventPayloadActor = {
    "id": number;
    "displayName"?: string;
};
export type EventPayloadFlags = string[];
