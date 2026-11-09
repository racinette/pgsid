export type GetChoiceParams = readonly [
];
export type GetChoiceRow = {
    "mixed": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    };
};
