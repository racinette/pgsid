export type GetViewParams = readonly [
];
export type GetViewRow = {
    "matrix": (number | null)[][];
    "flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
};
