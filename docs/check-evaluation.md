# CHECK evaluation

Generated row validators evaluate a CHECK against the values available before a
write. They return one result per constraint, in catalog order. The public
validator uses the owner and constraint name to report a failed CHECK.

An evaluated predicate has three SQL answers: true, false, and null. False
rejects the row. True and null pass, as they do in PostgreSQL. A fourth result,
unknown, means the local validator could not decide. It occurs when a required
column was omitted or an operation stopped before producing an answer. Unknown
lets the write reach PostgreSQL, which remains authoritative.

An evaluation error is distinct from unknown and SQL null. It carries a
SQLSTATE and stops validation. Boolean expressions preserve SQL evaluation
order, so a deciding left operand can avoid evaluating a right operand that
would error. A known false value decides an AND; a known true value decides an
OR. Otherwise uncertainty propagates until a later operand can decide the
expression.

A searched conditional evaluates its conditions in order. False and SQL null
skip an arm; a true condition evaluates only its selected result. If a
condition is locally unknown, the result remains unknown because the selected
arm cannot be determined. Errors in an unselected result do not occur.

## Generated evaluators

Supported constraints are lowered to a small Rust program. Maintained Rust
operations implement PostgreSQL callables; generated Rust composes them in
expression order. The same program is compiled as Rust and transpiled to the
target language. Go and TypeScript modules contain that transpiled program,
while row adapters convert public input values and results at the boundary.
The generated entry names are internal to the adapters.

The generator selects Rust support separately for each constraint. A
constraint outside the supported expression or value subset retains the
existing target evaluator. A group can therefore contain Rust and fallback
results without changing the public row-validator API or result order.
Fallback evaluators preserve unknown for expressions they cannot evaluate.

Target adapters distinguish a missing input from explicit null. Integer inputs
must fit their PostgreSQL width before entering the Rust representation;
values outside that width remain unknown locally. The target representation
of a SQL error carries its SQLSTATE back through the existing validation API.

Text operations in the Rust subset use PostgreSQL's C collation. Constraints
whose text semantics require another collation stay on the fallback path.
Supported `int4` addition and subtraction return PostgreSQL SQLSTATE `22003`
when the result is outside the `int4` range. The generated validator reports
that error through the same SQL error path as other supported operations.

## Scope of local validation

The validator sees the supplied row fragment, not a server-side row after
defaults, generated columns, or triggers. A missing value therefore never
becomes SQL null by assumption. PostgreSQL evaluates the final row and may
make a different decision after those server-side changes.

Local validation is an early check for known failures. The database CHECK
remains the final constraint. Reading an already stored row can ignore a local
unknown result because the database has already accepted that row.
