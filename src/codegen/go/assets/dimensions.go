package pgsid

// An array of a declared number of dimensions, one type per number: a value is never read for its
// dimensions.
type D1[T any] []T
type D2[T any] [][]T
type D3[T any] [][][]T
type D4[T any] [][][][]T
type D5[T any] [][][][][]T
type D6[T any] [][][][][][]T
