# Rust values

Generated Rust is a module tree that a crate mounts wherever it likes: a module
for each schema, holding that schema's enums, composite types, domains and
table rows, and a values module beside them for the PostgreSQL values no Rust
standard type holds whole. Every reference between the modules is relative, so
the tree works under any path. Values move through tokio-postgres in the
binary format, which the driver always reads results in.

## Nullability

A value that can be NULL is an option around its type, and one that cannot is
the type itself. Array elements can always be NULL, so their vectors hold
options.

## Temporal values

A date, a timestamp with or without time zone, and an interval are each an
enum of a finite value and the two infinities, so infinity is a value of its
own rather than a flag beside a time that would then mean nothing. A finite
zoned timestamp is a UTC instant, an unzoned one a wall-clock reading, and a
date a calendar day, each the corresponding chrono value. A finite interval
keeps its months, days and microseconds apart, as the server does, since a
month has no fixed number of days and a day no fixed number of microseconds
across a time-zone change. A value outside the range chrono represents is an
error when read, and a finite value the server cannot store, such as a finite
interval holding the encoding of an infinity, is refused when written.

## Numerics

A numeric is an opaque value that keeps the server's exact text: every digit,
its scale, NaN and the two infinities. It is parsed as numeric input reads text,
so it accepts and refuses what the server does and keeps the scale written, or
made from an integer, and it displays as numeric output writes it. Its
arithmetic, rounding, truncation and sign are PostgreSQL's own, taken from the
CHECK evaluator, which the values module carries only when a generated type
holds a numeric. So are its equality and order: values equal as numbers are
equal whatever their scales, and NaN equals itself and sorts after every other
value. An operation the server refuses, such as a division by zero, returns
the server's error with its SQLSTATE. JSON writes the exact text as a string
and reads a string exactly or a number as the double it denotes.

## Ranges

A range is an enum of the empty range and a pair of bounds, each including or
excluding its value or unbounded, as the standard library's bound type
expresses them. A range keeps the bounds it was built with; the server stores,
and reads back, its canonical form, so a range read again may differ from the
one written while describing the same values. A multirange is the list of its
ranges, which the server sorts and merges.

## Clocks

A time is a clock reading from midnight to 24:00:00, which the server allows
and chrono's time does not, so it is held as microseconds since midnight and
offers the chrono time where one exists. A time with time zone adds its offset
east of UTC, within the bounds the server keeps. Both are built only through
constructors that refuse anything outside those bounds.

## Geometric shapes

Points, lines, segments, boxes, paths, polygons and circles are structs of
float8 coordinates, which every pair of floats is, so their fields are their
values; the server refuses a shape its input does, such as a line whose A and
B are both zero, and keeps a box with its upper right corner first. The box is
named apart from the standard library's box.

## Identifiers and positions

A UUID is its sixteen bytes. Transaction and command identifiers, the full
transaction identifier with its epoch, a row's physical position, a
write-ahead log position, a visibility snapshot and the single-byte char type
are each a small type of their own, and a money amount is the integer count of
the currency's smallest unit the server stores, since its text depends on the
session's monetary locale. A value of an OID alias type, such as a table
reference, is the object identifier: the binary format carries no name.

## Network addresses and bit strings

An inet value is a host address with its prefix length and a cidr value a
network of the same parts, both on the standard library's address type. MAC
addresses are their bytes, and a bit string is its bits. Each writes the text
the server writes for it.

## Text-like values

XML, jsonpath, text search vectors and queries, and ACL items are held as the
server's text. They are sent as text, which the server reads with the type's
own input; vectors and queries are read from their binary form and written as
the server writes them, by the CHECK evaluator's own output functions. The
server has no binary output for ACL items, so they can be written but not read.

## Arrays

An array has the number of dimensions its column declares, one unless the
column's dimensions mapping declares another, and is never read for it from
the value. One dimension is a vector of options; a deeper single count is a
wrapper of nested vectors of that depth. Several declared counts are an enum
with a variant of nested vectors for each count, shared by every column that
declares the same counts. An array the server returns with another count fails
to read, naming the dimensions mapping, and an array whose sub-arrays differ in
length is refused before it is sent. The empty array reads as the variant of
the lowest declared count.

## JSON documents

A json or jsonb value is a container of the document's text, decoded into a
Rust type with serde on request, so a document is read without being parsed
and a decoding error belongs to the code that asked for the value. SQL NULL is
the absent option around the container; the JSON null document is a container
whose text is null. Building a document from text accepts only a single JSON
document, and building one from a value encodes it.

## Enums, composite types and domains

A PostgreSQL enum is a Rust enum with one variant for each label, and a
composite type a struct with one optional field for each attribute, both
matched to the server's names. A domain is a newtype over its base type. The
server describes a parameter as the domain but a result column as its base
type, so the newtype accepts either; a domain declared over another domain
wraps that domain's newtype.

## Table rows

Each table is a struct with one field for each column, optional where the
column can hold NULL, and reads itself from a result row by column name.
