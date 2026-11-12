package pgsid

import pgsidnull "example.com/pgsid-nulls/generated/pgsid/null"

type Null[T any] = pgsidnull.Null[T]
type Undefined[T any] = pgsidnull.Undefined[T]
type NullOrUndefined[T any] = pgsidnull.NullOrUndefined[T]
