export type GetAccessParams = readonly [
];
export type GetAccessRow = {
    "element": number | null;
    "incomplete": number | null;
    "sliced": (number | null)[][];
    "flexible_slice": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
};
