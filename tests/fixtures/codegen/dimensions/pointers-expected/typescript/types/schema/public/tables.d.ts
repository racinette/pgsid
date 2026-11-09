import type { TableTypes } from "../helpers.js";
export type Arrays = TableTypes<{
    "id": number;
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
    "owners": (import("./domains.js").UserId | null)[][];
}, {
    "id": number;
    "ordinary": (number | null)[];
    "matrix": (number | null)[][];
    "cube"?: (number | null)[][][] | null;
    "flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
    "optional_flexible"?: {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    } | null;
    "owners": (import("./domains.js").UserId | null)[][];
}, {
    "id"?: number;
    "ordinary"?: (number | null)[];
    "matrix"?: (number | null)[][];
    "cube"?: (number | null)[][][] | null;
    "flexible"?: {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
    "optional_flexible"?: {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    } | null;
    "owners"?: (import("./domains.js").UserId | null)[][];
}>;
export type ArrayView = TableTypes<{
    "matrix": (number | null)[][];
    "flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
}, never, never>;
