# Consumer design — query files to shipped TypeScript

The design for the first consumer of the engine. Nothing here is built. The
architectural ground rules were settled and are restated as constraints rather
than proposals.

## Six decisions

**Query discovery and naming.** Queries live in SQL files matched by config,
each opened by a name-and-command annotation, with a leading-at spelling for
named parameters. **There is no macro namespace**, because every macro in the
tool this dialect borrows from patches a weakness this one does not have — one
exists because another database lacks named parameters, one because that
tool's nullability inference guesses, one because another database lacks
arrays, one because it cannot prove group-nullability. Compatibility is a
ONE-SHOT CODEMOD, not a runtime alias layer, so the dialect can evolve without
carrying somebody else's bolt-ons. Multiple named queries per file; each is
exactly one statement, because the contract is per-statement. Cardinality is
always explicit, never inferred.

**Artifact shape.** Types first, but typed functions are designed in from the
start and the product does not ship without them. Functions are generated FROM
QUERIES, never from database functions — call those through queries. A single-
row command returns a row or undefined; a nullable column renders as a union
with null, never as an optional property, and that is not configurable.
Parameter rejection sets and optional-join outputs both emit as FACTORED LOCAL
UNIONS.

**Config surface.** YAML with a schema validator, single project per config.
Multi-schema is reached through the search path and qualification rather than
through config structure. Running without an external database server is a
constraint, not a default posture.

**Migration ordering and identity.** The schema entry is an ORDERED LIST of
single-directory entries, each a literal path or a literal directory with a
filename glob — no glob characters in the directory part, no separators in the
glob part. Entries apply in written order, files within an entry sort
lexicographically, and a file matched twice is a config error.

This keeps the one genuinely ambiguous case — ordering ACROSS sources —
explicit in the file, and covers both the baseline-dump-then-migrations and
extensions-preamble layouts. Any migration change, including editing an old
file, means rebuild: schema is a FOLD over the ordered list, so there is no
such thing as a partial reapply. Down-migrations are simply never matched.

Cross-directory timestamp interleaving is out of scope: if the services'
schemas are independent any order works, and if they are not, no config syntax
fixes it.

**Diagnostics contract.** The check command exits non-zero on ERRORS: config
errors, dialect errors, migration failures, statement-preparation failures,
and arity-gate mismatches — each means broken SQL or a broken invariant.
Engine refusals are WARNINGS: the query's artifact degrades to all-nullable,
loudly, and a strict flag promotes them to errors. **An engine gap never
blocks a user's build by default.** Positions are byte-precise from day one.

**Slice order.** Config and discovery, then the batch pipeline as a pure core,
then the emitter with goldens, then the parity suite written as the spec, then
the watch shell built to make it pass, then the language server last.

## Settled architecture

**One run path** for the command line and the language server, held by a
parity suite from the first vertical slice.

**The shared path is a pure, memoized derived-value graph**: config →
migration list → applied schema → snapshot → catalog → per-query contract →
artifact. Events exist only in the shells and terminate at "invalidate this
key". The command line is a shell that feeds inputs once and exits — no engine
mode, no stop-after-ready flag.

**Invalidation is a diff, not incrementality.** Any migration change rebuilds
the snapshot, the catalogs are diffed, and only queries whose dependencies
touch a changed entity are rechecked. Per-migration incrementality is not a
lever, because schema is a fold; the diff is where the saving lives.

**Trackers acquire input; the graph computes.** A tracker that computes is the
shape being retired. The event taxonomy, ready barrier and debounce patterns
survive as the watch shell's vocabulary.

## The dialect

An annotation on its own comment line opens a query block, which runs to the
next annotation or end of file and must contain exactly one statement.
Commands cover single-row, multi-row, execute, and execute-returning-count. A
last-inserted-id command is rejected permanently — it is another database's
concept, and the answer here is a returning clause. Batch and bulk-copy
commands are rejected as driver-specific rather than unsupported in principle.

Duplicate query names WITHIN a file are an error; the same name in different
files is fine, because emission is per-file. In a file mapped to generated
output every statement must belong to a named query; a file checked but not
generated from may contain bare SQL.

**Named parameters are detected with the real scanner, not a regular
expression.** A parameter is an operator token that is exactly the at-sign
with an identifier token adjacent. The scanner already understands strings,
dollar quoting, quoted identifiers, nested block comments and multi-character
operator tokens, so the rule inherits the database's lexical structure instead
of approximating it.

First appearance assigns a position; later occurrences of the same name reuse
it. Mixing named and positional parameters in one query is an error.

**One collision is documented rather than solved.** The database has a prefix
at-sign operator and permits custom infix ones, so an expression written tight
reads as a value followed by a parameter. The failure is LOUD, not silent —
the rewritten SQL fails to prepare. Spacing the operator avoids it, since
adjacency is what matches.

**The preprocessor contract:** the engine, the database and every analysis see
only NATIVE SQL — the canonical positional text after annotations are
extracted and named parameters rewritten. The rewrite records per-replacement
offset deltas so diagnostics map back to the author's text. Any macro from the
borrowed dialect is an error whose message names the fix.

## The artifact

Per source file: the canonical SQL constant, a parameter type, a row type, and
in wrapper mode a typed function.

**Parameters.** Named parameters become one object argument; positional-only
queries become positional arguments. A parameter proven null-rejecting is
non-nullable; otherwise it admits null. Joint rejection sets add one local
union per set, intersected with the flat object type.

**Rows.** Column names come from the database's own description of the result,
verbatim. The engine's best-effort names stay diagnostic-only. **Duplicate
output names are a dialect error** with an alias hint — an object type cannot
hold two identical keys, and the driver's row object silently collapses them,
so refusing is the only honest emission.

**The arity gate** is built into the emitter: the contract's positional
nullability is zipped against the database's column list only after a length
check, and on mismatch every column degrades to nullable with a loud
diagnostic naming the query.

**Wrappers** take a structural queryable interface that pools, clients and
pooled clients all satisfy, so transaction scoping stays the caller's.

**Determinism.** Atomic writes, skip-if-unchanged byte comparison, sorted
emission, no timestamps. Goldens assert byte equality AND compile the emitted
artifacts together with narrowing assertions, so the type-level behaviour is a
permanent compile-time check rather than a scratch experiment.

## The evaluator's timeout is the consumer's job

The engine cannot bound it. The engine imports no database type by charter,
and there is no in-process way to stop a runaway: **the database's own
statement timeout does not fire in this runtime**, and a same-thread timer
never gets to run, because the event loop is blocked inside the WASM module
for the duration.

A bound therefore has to be a KILL FROM OUTSIDE the thread running the query.
Terminating the worker does this promptly even on an instance wedged mid-query.

Rebuilding afterwards is cheap because **the evaluator needs only the
immutable slice of the schema** — types and immutable functions, no tables and
no data. Most evaluator queries run against an instance with no schema at all,
and the remainder want a domain or two.

**Take that slice from the LIVE CATALOG, never from migration text.** A
migration whose objects are created by dynamic SQL names none of them, and
they are recoverable from the catalog and not from the source.

**The timeout is bounded from below by the rebuild.** A kill costs a rebuild,
so a timeout shorter than that spends more on recovery than it saves on
waiting.

**The timeout is also the memory bound**, which is why no separate memory
guard exists. A single value cannot exceed the database's own size limit for
one datum, and accumulation is bounded by the clock, because allocation runs
at a measurable and roughly constant rate. Pick the timeout and the worst-case
allocation follows from it.

A consumer that supplies an unbounded evaluator gets no net at all. The engine
keeps its own probes cheap by construction, but the pathological tail is the
consumer's.

## The search path forces a negative dependency

The engine takes a search path and resolves unqualified names through it. What
the engine cannot decide is WHERE the path comes from — it is a per-connection
or per-project input, so the consumer owns it. Two things follow, and the
second is the one that will be missed.

**The path is an input to the graph**, so changing it invalidates every query
checked under it, through the same diff as a migration edit.

**Dependencies must record the resolution ATTEMPT, not just its result.**
Recording only the entity that was found is not enough under a multi-schema
path, and the failure is silent: a query resolves a name in the second schema
because the first has no such relation, a later migration creates it in the
first, and nothing invalidates — nothing was unknown at check time, and
nothing the query depends on was modified, yet the query now resolves to a
different relation with a different column list.

So the recorded dependency has to be "searched the first schema, ABSENT; found
it in the second", making the creation invalidate. The same holds for
functions, where a better-matching overload appearing earlier in the path
changes what the resolution concludes.

The engine's rule for unknown symbols — assume nullable — does not help here.
Nothing was missing, the resolution succeeded, and it succeeded at the wrong
relation only in hindsight. **This is an invalidation-index property, not an
inference one.**

## The parity suite

The executable definition of "one run path", written BEFORE the watch shell
exists.

Each corpus entry is a project plus an edit script. Run the batch over the
final file state; separately, start the watch shell at the initial state,
replay the edits, and drain to steady state. Compare emitted artifacts
byte-for-byte and diagnostics structurally. A second axis pins determinism:
the same batch run twice is byte-identical.

This is the drift lesson at product scale — the parity property is held by
tests, not by discipline.

## Decided against — do not re-open without new information

**A runtime compatibility layer** for the borrowed dialect. Aliases would
freeze its spellings into this one forever; a codemod pays the cost once.

**The embedding macro.** Superseded by proven presence groups, which need no
invented syntax. A nested emission stays possible later as pure emitter sugar
over the same data, so nothing is foreclosed.

**Optional-property nullables.** Drivers return null, not absent keys, so the
optional marker misstates presence as nullness. Not configurable — a config
axis here would double every golden.

**Cardinality inference.** Explicit annotations only; inference from a limit
clause is fragile and silent.

**A macro namespace of our own.** The dialect needs annotations and named
parameters, nothing else. Adopting the macro SHAPE without its reasons would
be cargo cult.

**Negation in schema entries.** The filename glob already selects; negation
was carrying multi-migrator generality the single-directory grammar
deliberately dropped.

**A config file that executes code.** Config is an input to a pure graph, and
executing user code to obtain it punctures hashing, invalidation and watch.

**Name-keyed contract joining.** Positions join, the database's own names are
used, and duplicate names refuse at emission.
