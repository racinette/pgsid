# TypeScript values

Generated TypeScript code decides how every PostgreSQL value looks in
TypeScript and how it travels. Drivers otherwise apply their own parsers: one
turns a timestamp into a JavaScript date and drops its microseconds, another
turns a bigint column into a native bigint, and each formats parameters its own
way. Generated queries therefore ask the driver for the server's text unchanged
in both directions and convert it themselves. A query takes a driver adapter
rather than a driver, and the generated runtime carries one adapter per
supported driver, so passing a bare driver is a type error.

## One shape per type

Each PostgreSQL type has one public TypeScript shape, used alike by query
parameters, result rows, table types and CHECK inputs. A domain takes its base
type's shape and an enum its label. The shape follows the type the server
reports for a parameter or column, which is what arrives on the wire; domains,
enums and JSON Schemas refine the declared TypeScript type without changing the
value.

Shapes keep the server's value exactly. Integers that do not fit a JavaScript
number are bigints, numeric values are decimal text, bytea is a byte array, and
a real is the single-precision value the server stored, not the nearest double
of its printed text. A range is either `{ empty: true }` or has a lower and
an upper bound, each `{ value, inclusive }` or `null` when unbounded, so an
unbounded side has no inclusivity to state. An empty range is a value without
points, distinct from SQL NULL, and a null bound is unbounded, unlike an
infinite one. Bounds take the shape of the range's
subtype, and a multirange is the list of its ranges. A composite value, and a
relation's row, is an object of its fields, each in its own type's shape. Timestamps are exact microsecond counts, an instant from the Unix
epoch for a zoned timestamp and a wall-clock reading for an unzoned one, and an
interval keeps its months, days and microseconds apart as the server does.
Infinite timestamps and intervals are values of their own, and dates are ISO
text whose years extend past four digits and below zero as astronomical years.
Geometric values are objects of exact float coordinates, and a JSON value is
typed as JSON unless a JSON Schema describes it. Money, bit strings, network
addresses, UUIDs, XML and text search values are the server's canonical text,
as client libraries already return them; money's text depends on the server's
monetary locale, so it is not reinterpreted.

## Sending and reading

Parameters are written in forms the server reads identically under every
session setting, such as hexadecimal bytea, the shortest text that reproduces a
float, and quoted array elements. A parameter of the wrong shape throws a type
error naming it before the server is contacted.

Results are the server's output text, decoded by the shape of the column's
type. Where the server offers more than one output format for a type, as for
bytea and intervals, the decoder reads each format it can read exactly. Dates
and timestamps are read in the ISO date style, as client libraries already
assume; any other style fails loudly instead of being misread.

## CHECK inputs

Generated CHECK validators and query prevalidation take the same shapes and
read them as the server reads the parameter. A value sent as text, such as a
text search value, money or a JSON value's JSON text, goes through that type's
own input function in the evaluator, under the server settings the project
declares. A value the server would reject as input, such as a timestamp outside
the input range or malformed text, fails each check that reads it with the
server's error, even a check whose CASE would not reach it: the server would
refuse the statement before any check ran. A supplied value whose reading
cannot be decided, such as an enum label the captured catalog does not list,
leaves each check that reads it undecided for the same reason. A column left
out stays undecided only where a check actually reaches it. A value of the
wrong shape is a type error, also where a check only tests the value for NULL.

The column's type modifier applies as it does on input: a varchar longer than
its length fails, trailing spaces past it are dropped, and a numeric rounds to
its scale before any check sees it. Elements of arrays, fields of records and
bounds of ranges convert the same way, each through its own type and modifier.
A part of a domain type then meets the domain's constraints as domain input
applies them, NOT NULL first and base domains before derived ones, failing with
23502 or 23514. The server reads a container's parts in order, so the first
part it rejects fails the whole value, an integer outside its type's range with
22003, and a part that cannot be decided, such as an enum label the captured
catalog does not list, leaves the checks reading the whole value to the server
rather than decided around that part, since the server may reject it.
