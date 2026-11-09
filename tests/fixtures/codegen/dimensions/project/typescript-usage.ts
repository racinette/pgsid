import type { GetArraysRow } from './generated/typescript/types/queries/arrays/GetArrays.js'
import type { GetNestedRow } from './generated/typescript/types/queries/arrays/GetNested.js'
import type { GetViewRow } from './generated/typescript/types/queries/arrays/GetView.js'
import type { GetAccessRow } from './generated/typescript/types/queries/arrays/GetAccess.js'
import type { GetChoiceRow } from './generated/typescript/types/queries/arrays/GetChoice.js'
import type { InsertFromCteParams } from './generated/typescript/types/queries/arrays/InsertFromCte.js'
import type { UserId } from './generated/typescript/types/schema/public/domains.js'

declare function expectType<T>(value: T): void
declare const row: GetArraysRow
expectType<(number | null)[]>(row.ordinary)
expectType<(number | null)[][]>(row.matrix)
expectType<(number | null)[][][] | null>(row.cube)
type Flexible =
  | { readonly dimensions: 1; readonly elements: (number | null)[] }
  | { readonly dimensions: 2; readonly elements: (number | null)[][] }
expectType<Flexible>(row.flexible)
expectType<(UserId | null)[][]>(row.owners)
declare const nested: GetNestedRow
expectType<(number | null)[][]>(nested.renamed)
declare const view: GetViewRow
expectType<(number | null)[][]>(view.matrix)
declare const access: GetAccessRow
expectType<number | null>(access.element)
expectType<number | null>(access.incomplete)
expectType<(number | null)[][] | null>(access.sliced)
declare const choice: GetChoiceRow
expectType<Flexible>(choice.mixed)
declare const input: InsertFromCteParams
expectType<(number | null)[][] | null>(input.matrix)
expectType<Flexible | null>(input.flexible)

// Several declared dimension counts are told apart by the count, never by nesting.
const vector: GetArraysRow['flexible'] = { dimensions: 1, elements: [1, null] }
const matrix: GetArraysRow['flexible'] = {
  dimensions: 2,
  elements: [
    [1, null],
    [2, 3],
  ],
}
void vector
void matrix
// @ts-expect-error The union does not include three dimensions.
const cube: GetArraysRow['flexible'] = { dimensions: 3, elements: [[[1]]] }
void cube
// @ts-expect-error The count must match the nesting of the elements.
const mismatched: GetArraysRow['flexible'] = { dimensions: 1, elements: [[1]] }
void mismatched
// @ts-expect-error A union value names its count.
const untagged: GetArraysRow['flexible'] = [1, null]
void untagged
// @ts-expect-error A fixed matrix cannot be a vector.
const wrongMatrix: GetArraysRow['matrix'] = [1, 2]
void wrongMatrix
// @ts-expect-error SQL NULL elements occur at the leaf level.
const nullRow: GetArraysRow['matrix'] = [null]
void nullRow
