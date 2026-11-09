export type GetNestedParams = readonly [
];
export type GetNestedRow = {
    "renamed": (number | null)[][];
    "flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
};
