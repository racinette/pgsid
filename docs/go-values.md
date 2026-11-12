# Go values

Generated Go code owns the representation of the PostgreSQL values a Go
standard type cannot hold whole. These value types live in the generated
`pgsid` package beside the schema, or beside the query support package when no
schema is generated, and the package is written only when generated code names
one of them.

## Temporal values

A date, a timestamp with or without time zone, and an interval are each a
struct whose fields are unexported. A value is built only through a
constructor, from a Go time for the dates and timestamps and from months, days
and microseconds for an interval, or is one of the two infinities of its type.
It is read only through methods that report whether it is finite before
handing out its time or its parts. Infinity is therefore never a flag beside a
time that would then mean nothing; it is a value of its own. The zero value of
each type is the finite zero time or the empty interval.

A zoned timestamp keeps the instant it was given and reads back as the
instant the server stored. An unzoned timestamp keeps the wall clock of the time
it was built from and holds it in UTC, and a date keeps its calendar day the
same way, so neither carries a location the server never saw. An interval keeps
its months, days and microseconds apart, as the server does, since a month has
no fixed number of days and a day no fixed number of microseconds across a
time-zone change.

The types implement pgx's typed scanner and valuer interfaces for their
PostgreSQL types, so pgx moves them in its binary format without any
registration on the connection or pool, and in the text format of the simple
protocol. That text follows the session's interval style, and an interval is
read from the server's default style and from the ISO 8601 style; the other
styles are refused rather than misread. A NULL needs a pointer to the value; scanning one into the value
itself is an error. PostgreSQL stores an infinite interval as every field at its
extreme, so a finite interval holding exactly those fields is refused before it
is sent rather than read back as infinity.

Each type also writes and reads a text form, which JSON encoding uses: the
infinities as `infinity` and `-infinity`, timestamps and dates in RFC 3339
layouts, and intervals as PostgreSQL's `iso_8601` interval style writes them.

## Ranges

A range is generic over the Go type of its subtype's values and holds either
the empty range or two bounds. A bound is built as including its value,
excluding it, or as no bound at all, so an unbounded end never carries a value
or an inclusivity that would mean nothing. A multirange is a slice of ranges;
with no ranges it is the empty multirange, and NULL needs a pointer, as for
every value of the package.

What is written is sent as written; the server canonicalizes it, so a discrete
range reads back in its canonical bounds and a multirange as its merged,
ordered ranges. An infinite value inside a bound is a value, distinct from an
unbounded end.

pgx moves ranges and multiranges in its binary format for the built-in range
types and for the user-defined ones its type registration loads. Over the
simple protocol a range or multirange writes PostgreSQL's range text, quoting
a bound the way range input reads it.

A domain over one of these values, directly or through other domains, is an
alias of the value's type rather than a type of its own, since a defined type
would drop the methods pgx moves the value with.

## JSON documents

A json or jsonb value is a container of the document's text, generic over the
Go type the document decodes into: the type generated from the JSON Schema the
column or expression is bound to, or any value when none is. The text is the
document as written or as the server sent it, so a json column reads back its
exact spelling, and it is decoded only when its value is asked for. A
document's value carries the column's schema check when runtime validation is
on, and reading the value runs the check and the decoding together, reporting
either failure with the query and column it came from. A document sent as a
parameter is checked before the statement runs.

The JSON null document is the container's zero value and a value of its own;
SQL NULL needs a pointer, or a null wrapper. pgx alone reads the null document
into a pointer as nil, so generated queries read a nullable document through the
package's own scan target, which keeps the two apart. Building a document from
a Go value encodes it without escaping HTML characters, and building one from
text accepts only a single JSON document.

## Null wrappers

The null wrappers that JSON Schema types and rows share live in a package of
their own beneath the value package, which names the same types. JSON Schema
types import only that package, so they can be used without the driver.
