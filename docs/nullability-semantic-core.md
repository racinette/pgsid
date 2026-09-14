# A semantic core for nullability — prototype proposal

## Status and hypothesis

This is an optional design experiment, not a replacement plan or a prerequisite
for consumer integration. The current implementation remains the production
path. The proposal must earn adoption through measured behavior and a simpler
account of how facts compose.

The hypothesis is that an explicit representation of rows, values and guarded
facts can reduce the special handling needed when evidence crosses a scope,
join, conditional branch or write boundary. This is not a hypothesis that a
general solver can infer every true PostgreSQL property.

The proposed core is a bounded abstract interpreter: it describes possible
rows without executing the query, retaining only properties useful to the
contract. Unsupported reasoning forgets facts; unsupported output shape
refuses analysis. Forgetting must enlarge the described possibilities, never
exclude a row that PostgreSQL could emit.

## Separate binding, relational meaning and proof

Lower supported syntax into a small relational representation before asking
nullability questions. Binding resolves references to stable identities;
lowering records the operations that produce rows; proof interprets those
operations under scoped assumptions. These are responsibility boundaries, not
independent flat passes that discard context between them.

| Layer                     | Responsibility                           | Must preserve                                                                 |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Binding and lowering      | Identify inputs, outputs and operations  | Scope, correlation, ordered slots, coercions and evaluation occurrences       |
| Relational interpretation | Describe possible rows and their facts   | Presence conditions, branch alternatives, row images and cardinality evidence |
| Expression proof          | Answer a nullness goal under those facts | PostgreSQL truth semantics and the assumptions used by the proof              |
| Contract projection       | Export only established claims           | Positional shape, mutually exclusive nullness flags and justified groups      |

Keep the original parsed statement available. Lowering for output reasoning
must not erase parameter typing sites in branches that cannot execute.
PostgreSQL remains authoritative for prepared column descriptions and type
resolution. Targeted catalog information supports proofs; the prototype must
not quietly become another PostgreSQL binder or optimizer.

## Rows carry refinements, not just nullable flags

A relation description contains ordered output slots, symbolic values for
those slots, guarded predicates and any established presence or cardinality
facts. A refinement means every represented row satisfies the recorded facts;
it need not characterize those rows completely.

Identify a slot by its bound producer and position, not its displayed name.
Self-joins, repeated output names and correlated references must remain
distinct. An alias changes how a reference binds, not which value it denotes.
A projection explicitly maps its output slots to input expressions, so
re-export can transport relationships rather than copying only final flags.

Every fact carries its validity conditions: scope, row image, participating
branch, presence requirement and relevant catalog or caller assumptions.
Moving a fact means proving those conditions still hold or translating them
through an explicit value mapping. Untranslatable facts are dropped.

Structural similarity is not sufficient for value identity. Repeated volatile
expressions retain separate evaluation occurrences. A stored generated value
may relate to its generation expression only under the schema and row-image
conditions that justify that relationship. Null-safe value identity must not
be encoded as an ordinary SQL equality asserted TRUE when either value may
be NULL.

## A bounded predicate language

Use a shared language for null tests, guarded value relationships, presence
and supported comparisons, with distinct judgments for TRUE, FALSE, UNKNOWN,
not-TRUE and not-FALSE. Boolean normalization must preserve SQL truth tables;
unsupported expressions remain opaque atoms rather than receiving invented
semantics.

A filter contributes that its predicate is TRUE. A validated CHECK contributes
that its predicate is not FALSE. Reaching a CASE arm contributes that its
guard is TRUE and earlier guards are not TRUE. Treating these as interchangeable
would erase the distinction the representation is intended to protect.

For a symbolic value, the nullness possibilities are NULL, non-NULL, or both.
Relation impossibility is separate from an unknown value and from analysis
refusal. Contradictory assumptions must not leak both nullness flags into the
public result; empty-relation handling must retain the established contract
policy rather than exporting arbitrary claims by vacuous implication.

Ask the same bounded entailment mechanism whether a value is NULL and whether
it is non-NULL. Share the context, not an assumption that the proof rules are
symmetric. Strictness can propagate a NULL input to a NULL result; proving a
non-NULL result requires the appropriate non-null-on-non-null guarantee.

Proof results retain a compact reason and their dependencies. Memoization
must distinguish different assumptions, presence conditions and row images.
A proof under a filter is not a reusable property of the expression alone.

## Relational operations transform the context

A scan introduces facts justified for the actual scanned relation set,
including the applicable inheritance, partition and constraint boundaries.
A filter strengthens that context with its accepted predicate. A projection
introduces output expressions and transports only relationships it preserves.

An inner join combines participating inputs and its accepted condition. A
left join has matched and null-extended alternatives. Right-side schema facts
and the join condition belong to the matched alternative; right-side output
slots are NULL in the extended alternative. A full join needs the distinct
unmatched alternatives for both sides, not merely a wider left-join rule.

Represent these alternatives with guarded facts where possible, rather than
enumerating every combination of optional units. Filter promotion becomes
elimination of an impossible absent alternative. Nested joins retain distinct
presence identities until a proof justifies relating or merging them.

For example, a filter requiring a right-side column to be non-NULL excludes
the right-absent alternative of a left join. A coalesce computed above that
join can instead manufacture a value from absence and does not prove presence.
An expression computed inside the right input occupies a slot that the join
null-extends as a whole. Lowering must preserve that placement distinction.

Presence groups are extracted from retained relationships: absence nulls all
members, and each discriminant is non-NULL under presence. If abstraction
loses either proof, omit the affected group claim. Do not construct public
groups merely from shared provenance.

Alternatives meet at their shared guarantees, with guarded relationships
retained only within a work budget. An unproved branch remains possible.
Bag semantics and cardinality remain explicit: a scalar subquery can introduce
NULL through absence even when its projected value is non-NULL on every
inner row. Grouped and ungrouped aggregates require different empty-input
transfer rules. An unknown cardinality must not be treated as guaranteed
existence.

## Writes are transitions between row images

Model OLD, proposed assignments and returned NEW as distinct environments.
Assignment expressions read their proper source environment; simultaneous
assignments must not accidentally read earlier assignments' NEW values.
Selection predicates constrain OLD. They constrain NEW only through proven
unchanged values or another justified relationship.

Assignment coercion is an explicit semantic operation, including destination
modifiers and domain behavior. Do not assume a source literal denotes the
stored value, or that an arbitrary explicit cast reproduces every assignment
context. A value relationship is admitted only where the conversion is
supported and justified; otherwise preserve only independently proved facts.

Constraints on a successfully returned stored row can refine NEW under their
enforcement conditions. Generated values relate to the appropriate NEW
dependencies; reuse of an OLD proof requires dependency preservation. Hooks
or rewrites that can replace the proposed row invalidate unsupported
assignment relationships, not merely a cached final nullability flag.

Each producing INSERT, conflict or MERGE path contributes a separate
transition. A non-producing action contributes no returned alternative;
DELETE contributes the appropriate OLD image. The output describes all
producing alternatives, never whichever path was visited first. A modifying
CTE exports the resulting slots and justified relationships through the same
projection boundary as a read query.

## PostgreSQL remains the value oracle

Reuse the existing catalog and bounded evaluation boundary. The proof core
may establish that a substitution is valid, but the evaluator receives only
the resulting closed expression. It does not acquire table access, name
resolution or permission to evaluate arbitrary user code.

Evaluation answers retain their resolved semantics and exact values; transport
must not round numeric values through host-language numbers. Comparison
proofs retain collation and operator assumptions. A rejected, unavailable,
timed-out or session-dependent evaluation contributes no answer, not FALSE.

The existing proof kernel is a candidate building block, not evidence that
the prototype works. Sharing measured PostgreSQL semantics avoids duplicating
that knowledge, while independent lowering and fact transport provide the
architectural experiment. Shared components can still hide shared bugs, so
agreement between implementations never substitutes for live execution.

## Keep parameter quantifiers separate

Parameter rejection remains a separate analysis, even if it shares bound
references and expression metadata. Existential execution-time rejection is
not a universal fact about emitted rows. Bind-time rejection can supply
output assumptions only through its separately justified channel.

Retain minimal joint rejection sets and statement-level unconditional
rejection with their existing meanings. Output branch pruning must not remove
bind-time typing evidence. A uniform representation of facts is not a license
to merge claims with different quantifiers.

## Bounded work is part of the design

Use a finite vocabulary of relevant atoms and bounded guarded alternatives.
When a budget is exhausted, discard relationships or widen the description;
do not drop a possible branch to make the proof finish. Track loss of
precision separately from structural refusal.

Recursive relations need a sound over-approximation and checked fixed-point
or widening discipline. A favorable intermediate iteration is not a proof.
The small prototype should refuse recursion rather than claim a partially
designed solution. Cyclic generated or provenance reasoning also needs an
explicit conservative cycle boundary.

## The smallest useful experiment

Start outside the production dispatch path with scans, filters, projections,
CASE expressions and a left join over supported expressions. This slice must
already exercise a CHECK-derived branch fact crossing a projection and a
presence fact established by a filter. A scan-only prototype cannot test the
composition hypothesis.

If that representation is useful, add a narrowly supported UPDATE RETURNING
transition with destination coercion and an unchanged generated dependency.
This is the stress case for whether row images and fact transport become
explicit instead of being reconstructed by special cases. Mark all other
surfaces unsupported until they have transfer rules and regression owners.

Measure the prototype on the existing fixtures and generated queries without
calling the production walker to fill its unsupported results. Record support
and refusal separately from agreement; otherwise fallback can manufacture
apparent parity. Continue using the production implementation for consumers.

## Evidence required to continue or adopt

Compare ordered output shape, both nullness directions, presence groups and
parameter contracts under identical catalog and evaluator inputs. Report
soundness violations, precision losses, newly proved claims and unsupported
shapes separately. Adjudicate disagreements against PostgreSQL and the
intended contract rather than automatically copying the current answer.

Keep bidirectional fixture expectations, live NULL and non-NULL witnesses,
generated compositions and representation-crossing checks. Mutation tests must
break the new boundaries deliberately: turn CHECK acceptance into truth,
erase an absence alternative, merge OLD with NEW, omit assignment coercion,
or reuse a proof under a different context. Each admitted mechanism needs an
executing owner that notices its removal or unsound relaxation.

Benchmark analysis time, retained memory, evaluator work and budget exhaustion
against the current implementation on the same corpus and input sizes. Set
acceptable regression limits before considering a cutover, not after seeing
the result. Performance is part of the experiment, not a presumed benefit of
normalization.

The maintenance test is a concrete composition change: can it be expressed by
a local transfer rule and explicit proof dependencies without adding parallel
special cases across consumers? Inspect both the lowering and the proof core;
moving the old complexity into lowering is not a reduction.

Stop if the representation mostly relocates special cases, loses useful
precision within reasonable budgets, or offers no demonstrated maintenance
benefit. Production adoption requires supported-surface contract parity,
adjudicated improvements, conservative boundary parity and acceptable measured
costs. Passing a finite corpus is evidence for that decision, not a universal
soundness proof. A useful experiment may remain a prototype indefinitely.
