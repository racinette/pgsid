export type GetArraysParams = {
    "id": number | null;
};
export type GetArraysRow = {
    "ordinary": (number | null)[];
    "matrix": (number | null)[][];
    "cube": (number | null)[][][] | null;
    "flexible": (number | null)[] | (number | null)[][];
    "optional_flexible": (number | null)[] | (number | null)[][] | null;
    "owners": (import("../../schema/public/domains.js").UserId | null)[][];
};
