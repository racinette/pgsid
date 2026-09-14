# Open items

Work that is open. Nothing else — completed work is not recorded here,
because the suites re-derive what the engine does and git holds the order it
was built in.

Every entry states its TRIGGER: the condition under which someone should pick
it up. An entry with no trigger is not deferred, it is abandoned.

---

### Sweep every catalog read for rows PostgreSQL adds that nobody wrote

A catalog read can return more than the schema author declared, and a reader
assuming one row per declaration is wrong without ever looking wrong. Ran
once; both findings were real and neither moved a nullability claim, which is
the finding under the finding — both survived because nothing downstream was
strict enough to notice.

That immunity has since expired for domain checks: the subtree evaluator now
walks a domain chain to decide whether a cast renders immutably, so a
truncated capture would reach real claims.

**Trigger.** The next time any capture is added to the snapshot, and before
the consumer's first contract-holding slice. Check which consumers a capture
actually has before assuming it is diff-only — that set grows without anyone
revisiting this entry.

### Operational trust declarations — the foreign-key assumption

Foreign-key entailment reads a validated, enforced, non-deferrable key as a
guarantee that the join matches. Three routes falsify that with no catalog
trace, all measured: disabling triggers on the referencing side (foreign keys
are system triggers, and both validity flags stay true), the session-level
replication role, and disabling triggers on the referenced side, where a
cascade never fires. Nothing revalidates afterwards.

**The default is settled and is not to be re-litigated.** A declared key is
the schema author's invariant, the dirty state is one where the database
misrepresents itself, and PostgreSQL's own planner has trusted validated keys
for join selectivity for years without revalidating them. What is missing is
a way for a consumer that KNOWS its keys are unenforced to say so.

The engine half is five lines — an option beside the search path, with the
two foreign-key maps coming back empty. The rest is not: the value has to
reach the adapter from project configuration that does not exist, and the
granularity is a consumer-config question. Deliberately NOT per query —
whether keys are enforced is a property of how a database is OPERATED, which
the query author does not know.

**Trigger.** With the consumer's config slice.

### The host's database-default collation is a consumer setting

Column-level collations travel in DDL, so a replica carries them and the
kernel's gates fire correctly. The DATABASE default does not travel — it is
an operational property of the host — and the engine currently equates
"default" with the replica's default.

Two facts ride on it. Literal DISTINCTNESS is sound under any deterministic
host default, because deterministic means equality is byte equality. Text
ORDER facts are answered by the replica's session, so a host whose locale
sorts differently could diverge.

**Trigger.** With the consumer's config slice. Until then the safe narrowing
is to gate text-ORDER facts on a declared host default; distinctness needs
only that the host default is deterministic, which is the overwhelming case.

### Declaring relations that exist only when the application runs

A function body may create its own temporary table and then use it. That is
valid code, and the checker correctly reports the relation as missing,
because it genuinely is not in the schema. What should change is whether the
user has DECLARED it runtime-created — not the diagnostic.

Every documented alternative was measured out first. A pragma inside the
function body is unusable: it is not a call the tool makes, it is part of the
user's migration text, which also runs against a production database with no
checking extension installed — creation succeeds there and the call fails, so
recommending it would ship a bug to fix a false positive. It cannot be
supplied from outside the body either. The per-function opt-out setting in
the upstream documentation does not exist in this runtime. A suppression
annotation was considered and rejected, because a pre-created relation
DECLARES rather than silences: the body stays fully checked, and a real typo
in the same function is still caught.

**The shape.** A configuration key naming a file of ordinary DDL, under the
key that already means "the instance the engine stands up". No new syntax
anywhere, which was the whole objection to an annotation.

**Placement is fixed by measurement, not taste:** inside the validation
transaction, after temporary objects are discarded. Earlier and the discard
wipes it; inside the transaction so the rollback cleans it and nothing
reaches the snapshot. The plumbing question is that the schema builder takes
no configuration today.

**Accepted cost, measured:** a declared relation is visible to every function
checked in that run, so it masks a genuine missing-relation error in an
unrelated function using the same name. Narrower than a general ignore —
opt-in per relation, not per diagnostic. The escalation, if it bites: make a
declared relation visible only while checking a function whose body textually
creates it, a substring match with no parser.

**Decided against: hinting at this key from the diagnostic.** A missing
relation is usually exactly what it says — the table is absent, the function
was written ahead of it, or the name is a typo. Attaching the escape hatch to
every instance advertises it as the first move on a genuinely broken
function. Documented instead, and found by someone who already knows they
have a runtime-created relation.

**Also dropped: a "before migrations" sibling** for extensions, roles and
schemas a migration assumes but does not create. Proposed from symmetry, and
no measured case needs it; naming a pair is where the confusion about which
file to use would live.

**Trigger.** The consumer's config slice, which is when a configuration key
can exist at all.

### Where the search path comes from

The engine already takes a search path as an argument. What is missing is the
configuration channel that supplies it — a consumer input, not an engine one.

**One hole rides with it and is not closable by recording entities:** a
dependency on a function that does not exist YET. A better-matching overload
created later in an earlier schema changes the answer, with nothing to hang
the invalidation on, and the identical hole exists for unqualified relation
references. It is a property of tracking unqualified names under a search
path, so it belongs to the consumer's design rather than the engine's.

**Trigger.** With the consumer's config slice.

### Five drafted upstream tickets, written and not filed

The sqlc disagreement register is adjudicated and executable — every
per-column disagreement settled by data that re-runs, no unsoundness and no
imprecision on this side. Filing the tickets is an upstream contribution and
nothing here waits on it.

**One report beside them is different, and it IS engine work.** The drafted
SQL/JSON missing-feature report against the deparser is the sole blocker on
seven expression node kinds the closed grammar would otherwise admit. It is
the one item in this register where filing a report unblocks the engine.

**Trigger.** For the tickets, whenever someone wants to spend the time
upstream. For the deparser report, whenever the closed grammar's SQL/JSON
group is worth having.

### A set-returning unnest over an operand nothing can type

A lone-argument unnest contributes ONE output column, which is a recorded
SHAPE residue rather than a fact. Unnesting a text-search vector is really
three columns, and contributing one misaligns every flag after it — the
class of defect where the column list itself is wrong. The lone-argument
spelling now dispatches on the operand's type, and an operand set containing
that type refuses outright.

What remains is the fully UNTYPED operand, kept at one column because the
common untyped operands are arrays by construction — unnesting an aggregated
array, an array subquery, a polymorphic aggregate — three measured shapes the
type reader refuses by design. That is the same "no application schema has
one" reasoning that has twice been convicted here, which is why it is
recorded rather than trusted.

**Trigger.** When the type reading learns aggregate return types, the
operand stops being untyped and this closes with it.

### The datetime settings residue

Immutable datetime rows are served with no settings assumption, leaving a
stable-row residue, and all six input functions are still stable. What to do
with that residue stays open.

**Trigger.** A consumer corpus that needs a stable datetime row folded.

### Four builtin rows blocked on the runtime

The logical-slot reading functions and their binary twins are the only
unprobed group with a nameable revisit trigger. Reading a slot needs an
output plugin whose result a SELECT can consume; the only plugin in this
build writes to a replication connection and takes the backend down when
called from a SELECT. The plugin that would work is contrib and is not in the
published distribution.

**Trigger.** A future runtime build that ships it.

### Semantic re-founding — standing TODO, parallel track

Optional architecture research, not a prerequisite for consumer delivery.
Scheduling this work requires a concrete composition problem and a bounded
experiment; a preference for a different representation is not a delivery
requirement.

**Trigger.** Entries arriving from consumer corpora, or a feature that is
hard for the current architecture and natural for this one.
