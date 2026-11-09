export type GetArraysParams = {
    "id": number | null;
};
export type GetArraysRow = {
    "ordinary": (number | null)[];
    "matrix": (number | null)[][];
    "cube": (number | null)[][][] | null;
    "flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
    "optional_flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    } | null;
    "owners": (import("../../schema/public/domains.js").UserId | null)[][];
};
