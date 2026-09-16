export type GetEventParams = {
    "id": bigint | null;
};
export type GetEventRow = {
    "id": import("../../schema/public/domains.js").EventId;
    "payload": import("../../jsonschemas/index.js").EventPayload;
    "actor": import("../../jsonschemas/index.js").EventPayloadActor | null;
    "state": import("../../schema/public/enums.js").EventState;
    "created_at": Date;
    "joined_account_id": bigint | null;
    "display_name": string | null;
} & ({
    "joined_account_id": bigint;
    "display_name": string;
} | {
    "joined_account_id": null;
    "display_name": null;
});
