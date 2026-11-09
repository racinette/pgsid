export type SharedDimensionsParams = {
    "shared": (number | null)[][] & ({
        readonly dimensions: 1;
        readonly elements: (number | null)[];
    } | {
        readonly dimensions: 2;
        readonly elements: (number | null)[][];
    });
};
export type SharedDimensionsRow = {};
