export type InsertArraysParams = {
    "id": number;
    "ordinary": (number | null)[];
    "matrix": (number | null)[][];
    "flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
    "owners": (import("../../schema/public/domains.js").UserId | null)[][];
};
export type InsertArraysRow = {};
