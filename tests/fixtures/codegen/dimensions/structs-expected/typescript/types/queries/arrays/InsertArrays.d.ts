export type InsertArraysParams = {
    "id": number;
    "ordinary": (number | null)[];
    "matrix": (number | null)[][];
    "flexible": (number | null)[] | (number | null)[][];
    "owners": (import("../../schema/public/domains.js").UserId | null)[][];
};
export type InsertArraysRow = {};
