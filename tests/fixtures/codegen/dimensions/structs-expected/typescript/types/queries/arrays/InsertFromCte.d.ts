export type InsertFromCteParams = {
    "matrix": (number | null)[][] | null;
    "flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    } | null;
};
export type InsertFromCteRow = {};
