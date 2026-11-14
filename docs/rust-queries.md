# Rust queries

Each query file becomes a Rust module of its own, which the crate declares
where it likes. A query module names the generated schema tree by its path in
the crate: the directories between the crate's source directory and the tree,
or the path the schema configuration gives when the tree lives elsewhere.
Queries therefore need the schema tree, which also holds the values module
every query's types come from. Because query modules are rendered apart from
the tree, the values module holds whatever a query may name once queries are
configured: the CHECK evaluator's numeric and text-search values, and the
dimension enums of every set of counts the mappings declare or share.

## What a query generates

A query has its SQL as a constant, a struct of its parameters where it takes
any, a struct of its row where it returns one, and an async function that runs
it through any tokio-postgres client, a connection or a transaction alike. A
query returning one row gives the first row the server returns, or none; one
returning many gives every row in order; one executing gives nothing, or the
number of rows it affected. Every function fails with one error type: the
database's error, which also carries a value that failed to read, or a row
that no member of one of the query's groups describes.

## Parameter and column types

A parameter has the type the server describes for it, optional unless the
analysis proves it set, and an array parameter written to columns with
declared dimension counts takes the counts they share. A column read straight
from a table or view has that column's own type, so a domain column is the
domain's type although the server describes it as its base type; any other
column has the type the server describes. A text or integer column whose
CHECKs admit only some literals is an enum of them, named after the query and
the column, which fails to read a value outside the set.

## Row groups

An outer-joined relation, and columns a table's CHECKs tie together, are a
group: an enum the row holds in one field, in place of the group's first
column, with a variant for each member carrying the columns its rows hold.
Members, nesting and names follow the shared row-group model: an absent and a
present variant for a relation, a variant for each discriminant value the
CHECKs mention, one for the values they never mention, and one for NULL; a
relation holding one CHECK group adds its absent variant to that group, and a
present variant holding several carries each as a field of its own enum. A
variant field that is set in every row of the member is not an option.

A row is read by matching the group's columns, in member order, against
patterns that state each member's test: a column NULL or set, an enum or
boolean value by its variant or literal, an integer by its literal, and text
or a float by comparison. A row matching no member is the error naming the
query and the group, and the match leaves that arm out where the earlier
patterns already take every row. A group whose discriminant has a type no
pattern or comparison can test, such as a domain, is no group: its columns
stay in the row.
