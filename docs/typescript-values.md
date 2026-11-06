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
of its printed text. A range is either empty or has bounds and inclusivity; an
empty range is a value without points, distinct from SQL NULL, and a null bound
is unbounded. Types without a dedicated shape yet arrive as the server's text.

## Sending and reading

Parameters are written in forms the server reads identically under every
session setting, such as hexadecimal bytea, the shortest text that reproduces a
float, and quoted array elements. A parameter of the wrong shape throws a type
error naming it before the server is contacted.

Results are the server's output text, decoded by the shape of the column's
type. Where the server offers more than one output format for a type, as for
bytea, the decoder reads each of them.
