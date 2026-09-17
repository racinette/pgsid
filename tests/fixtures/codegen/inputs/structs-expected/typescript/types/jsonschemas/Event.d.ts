export type Event = {
    "actor": number;
    "label"?: string;
    "next"?: Event;
};
