package pgsid

// The wrappers live in a package without the driver, which JSON Schema types use on their own;
// these names are the same types.
type Null[T any] = pgsidnull.Null[T]
type Undefined[T any] = pgsidnull.Undefined[T]
type NullOrUndefined[T any] = pgsidnull.NullOrUndefined[T]
