export type GetAccessParams = readonly [
];
export type GetAccessRow = {
    "element": number | null;
    "incomplete": number | null;
    "sliced": (number | null)[][];
    "flexible_slice": (number | null)[] | (number | null)[][];
};
