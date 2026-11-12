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
