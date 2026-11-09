export type OptionalFlexibleParams = readonly [
];
export type OptionalFlexibleRow = {
    "optional_flexible": {
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    } | null;
};
