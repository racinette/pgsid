import type { TableTypes } from "../helpers.js";
export type Arrays = TableTypes<{
    "id": number;
    "ordinary": (number | null)[];
    "matrix": (number | null)[][];
    "cube": (number | null)[][][] | null;
    "flexible": (number | null)[] | (number | null)[][];
    "optional_flexible": (number | null)[] | (number | null)[][] | null;
    "owners": (import("./domains.js").UserId | null)[][];
}, {
    "id": number;
    "ordinary": (number | null)[];
    "matrix": (number | null)[][];
    "cube"?: (number | null)[][][] | null;
    "flexible": (number | null)[] | (number | null)[][];
    "optional_flexible"?: (number | null)[] | (number | null)[][] | null;
    "owners": (import("./domains.js").UserId | null)[][];
}, {
    "id"?: number;
    "ordinary"?: (number | null)[];
    "matrix"?: (number | null)[][];
    "cube"?: (number | null)[][][] | null;
    "flexible"?: (number | null)[] | (number | null)[][];
    "optional_flexible"?: (number | null)[] | (number | null)[][] | null;
    "owners"?: (import("./domains.js").UserId | null)[][];
}>;
export type ArrayView = TableTypes<{
    "matrix": (number | null)[][];
    "flexible": (number | null)[] | (number | null)[][];
}, never, never>;
