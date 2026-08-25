# From migrations to a catalog

How a directory of SQL files becomes the schema the engine reads, and how a
diagnostic in a function body finds its way back to the byte range that
defined it.

## Two phases, because migrations reference forwards

Applying and validating are separate passes over the same files.

Applying runs every statement with function-body checking turned OFF for the
whole transaction. Validating happens only after every migration has been
applied, against the final schema state.

The reason is ordinary and unavoidable: **a function defined in one migration
may legitimately reference a table created in a later one.** Validating as you
go would reject a schema that is entirely correct once complete.

## Applying

Each file is parsed with byte offsets. A parse error is a diagnostic and halts
the chain.

**One preprocessing step, and only one:** the concurrency modifier is stripped
from index statements so the file can run inside a transaction. Nothing else
is removed. The removals are recorded so that an error position in the
stripped text maps back to an offset in the file the author wrote.

Statements execute one at a time, and the outcome of a failure depends on what
failed. A statement error poisons the transaction and halts immediately. A
function BODY error does not halt at all — the function is created, the
migration succeeds, and the error surfaces in validation. That asymmetry is
the whole point of the two phases.

## Provenance is recovered by diffing the catalog, not by reading the SQL

The question a body diagnostic has to answer is: *which statement last defined
this body?* The obvious approach is to read the statement and see what it
creates. That approach cannot work, and the reason is worth stating plainly.

**Any statement can create, replace or drop a function.** A block of
procedural code can build a definition as a string and execute it. Calling a
function can create another. Inserting a row can fire a trigger that does.
Dropping a column with cascade can remove several. Drawing up a list of
"function-affecting statement kinds" would be both fragile and incomplete.

So the function catalog is snapshotted around EVERY statement, and provenance
falls out of the diff. A row that appears records the statement that created
it. A row that changes updates it. A row that vanishes drops it.

The snapshot is deliberately cheap — identity columns only — with the body
text fetched on demand only for rows the diff flags. Two lightweight queries
per statement against a schema-only database costs nothing worth optimizing.

**Two identity columns are needed, not one.** The transaction id changes
between migration files but not within one; the physical row location changes
within a single transaction. Together they detect a replacement that produced
an identical body — PostgreSQL still writes a new row — and disambiguate which
of several functions was the one replaced.

## The body/metadata split, and the useful false positive

When the diff flags a row, the body text is compared against what provenance
recorded.

**Body changed** — provenance moves to the statement that just ran.
**Body unchanged** — provenance is PRESERVED, still pointing at whatever
statement last defined that body, and only the metadata is refreshed. A
rename, an owner change, or a same-body redefinition therefore does not
capture the blame.

That preservation produces a false positive on purpose, and it is worth having.

Consider a broken function defined statically in one migration and
redefined — with the same broken body — by a dynamic block in a later one. The
body did not change, so the diagnostic points at the STATIC definition rather
than the dynamic block.

That is the more useful place to look first, and it is self-correcting. Fix
the static definition and the dynamic block now writes a body that differs
from it — so the next run sees a body change, provenance shifts to the dynamic
block, and the diagnostic lands there. **The system converges on the right
location after one iteration.**

## Why dynamic SQL is not parsed

Reading a definition out of a dynamically executed string would mean
evaluating a string that may be assembled at run time, handling nested dollar
quoting several levels deep, and supporting every string-building construct
the procedural language offers.

That is intractable in general, and the design does not attempt it. What it
does instead is recover the FACT of creation from the catalog, and locate the
body by searching the statement's own text for it. When the body is not found
there — because it was assembled rather than written — the diagnostic falls
back to the whole statement.

**The invariant that makes this safe: the recorded body text always equals
what the catalog currently holds.** Body changes update it, metadata changes
preserve it because it already matches, new functions set it, dropped
functions remove it.

The practical consequence is worth telling users: the more static a migration,
the more precise its diagnostics. That is inherent to dynamic SQL rather than
a limitation of the tool.

## Validating

Every surviving user function is checked against the completed schema.

Provenance gives a statement identity rather than a byte range, and the range
is resolved on demand from a fresh parse. That decoupling is deliberate:
provenance is immutable once recorded during apply, while file offsets move
whenever the file is edited. Storing offsets would marry the two.

Each language is checked its own way. Procedural bodies go through the
checking extension directly. Trigger functions are checked once per trigger
BINDING, since the relation and its transition tables are what the body's
references resolve against — and each diagnostic carries a related location
pointing at the statement that created the binding, which is what connects an
error inside a body to the thing that exposed it. A function with no trigger
attached is skipped. Plain SQL bodies are re-created with checking turned back
on, inside a savepoint that is rolled back afterwards.

Validation does not halt on the first failure. Functions are independent, and
a run should report all of them.

## Offsets are bytes, and that is not pedantry

Every offset computation works in bytes rather than characters. A comment
containing multi-byte text before a function body makes character indices and
byte offsets diverge, and the error then lands in the wrong place — subtly,
and only for the users whose comments are not ASCII.

**Mapping a re-created definition back to the original** relies on one
property: the regenerated text has a different header from what the author
wrote, but the BODY is byte-identical. So an error position inside the body
translates by subtracting the body's offset in the regenerated text and adding
its offset in the original. An error in the header has no such mapping and
falls back to the whole statement.

## Two failure modes, and only one of them stops everything

**Applying failed** — a statement error, or a procedural block the checker
rejects. The transaction rolls back, there is no catalog, and nothing
downstream runs until the schema is fixed.

**Validating failed** — one or more function bodies are broken. The schema IS
committed and the catalog IS usable, because **a function with a broken body
is still a catalog object.** It exists, it has a signature, and queries can be
analysed against everything else. Queries that actually call it will collect
their own errors.

Treating these the same way would make one bad function body block an entire
project's analysis for no reason.

## Change detection by structure, not by bytes

A file's identity for caching purposes is the hash of its parsed structure
with positions and comments stripped and semantically unordered lists
normalized — not the hash of its text.

The consequence is that reformatting, recommenting or changing keyword case
does not invalidate anything. A file that fails to parse has no hash and is
treated as definitely changed.

Within a file, comparing statement chains yields the index of the first
statement that differs, so a re-apply can start there rather than from the
beginning.

## The catalog is built once and served many times

The design that follows from an expensive build and cheap reads: build the
schema in a throwaway instance, capture it, and serve analysis from instances
loaded with that capture.

Each generation of instances carries exactly one schema state, tagged. Only
the current generation serves requests. When a rebuild completes, fresh
instances are created from the new capture and swapped in atomically; the
previous generation drains its in-flight work and closes. A caller that
acquired an instance checks the generation before trusting a result, because
a result computed against a superseded schema is not wrong so much as
irrelevant.

Per-request hygiene is a transaction that always rolls back, with prepared
statements deallocated first, so nothing a check does — session settings,
prepared statements, a function the checker had to redefine — survives it.

**The build is cached on the ordered structural hashes plus a fingerprint of
everything else that could change the outcome**: the schema file list, the
database version, the extensions, whether body checking is available. Only a
completely successful build is cached; a partial schema is never stored.
