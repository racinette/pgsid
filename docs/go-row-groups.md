# Go row groups

A query's row often says more than its columns' types: an outer-joined
relation is either absent, every column NULL, or present with its key set, and
a table's CHECK constraints may tie columns together so that one column's value
decides which others are set. Generated TypeScript intersects union types with
the flat row to say this. Go has no intersection types, so generated Go gives
each such group of columns a type of its own and the row one field holding it.

## Groups and members

A group is a sealed interface, and each of its members a struct of the columns
its rows carry. The row's other columns stay plain fields, and a group's field
takes the place of its first column.

- **An outer-joined relation** has an absent member, with no fields, and a
  present member holding its columns, those that are set whenever the relation
  is with their non-NULL types. A relation is a group only when some column
  tells it present; otherwise its columns stay in the row.
- **Columns tied by CHECKs** have one member per discriminant value, as the
  shared CHECK analysis names them: each value the CHECKs mention, one member
  for the values they never mention, which carries the discriminant, and one
  for NULL. Where no column's value decides, which columns are set may, and
  each pattern is a member. A value member leaves its discriminant out, since
  the member says it, and every member leaves out a column its rows always hold
  NULL. A group whose members would be merged combinations is no group.
- **Both together**: an outer-joined relation holding one CHECK group is that
  group with an absent member added, so one field tells absence and case
  apart. Holding several, or an outer join nested in it, its present member
  holds each as a field of its own.

## Names

A relation's group is named after the relation as the statement's select list
qualifies its columns, or after its table. Two CHECK groups of one table, and
CHECK groups inside a present member, are named after their discriminant
columns. A name a remaining column already uses takes a suffix. A member is
named after its value, a number together with its column so that it is a name,
and members whose names meet are numbered.

## Reading rows

Grouped columns are scanned into locals, and a builder per group picks the
member from them in order: absence first, then each value, then the other
values, then NULL. A row that is none of the members is an error naming the
query and the group; the members describe at least every row the table's
validated CHECKs admit, so only a row the analysis misjudged reaches it.
Parameters stay flat structs.
