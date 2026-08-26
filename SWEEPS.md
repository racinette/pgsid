# Adversary sweeps

## What a sweep is

A sweep is a deliberate attempt to prove this project wrong. Someone takes
the position of an attacker with full access to the source, picks a surface,
and spends a working session trying to make the project state something
false.

It is not testing. A test confirms that code behaves the way its author
expected. A sweep starts from the opposite posture: **the claim is presumed
wrong, and the work is to find the case that shows it.**

The unit under attack is a CLAIM, not a file. A claim is anything this
project asserts that could be false: a column will never be null, this set of
inputs is rejected, that list of names is complete, this cannot be closed
without work nobody plans to do. Some claims are made by code and some are
made by prose. Both are in range, and they fail the same way.

## Why the project needs one

Every other instrument here shares an author with the thing it checks. A
fixture and the code it exercises are usually written in one sitting by one
person; a generated corpus draws from a vocabulary somebody chose; an
assertion encodes what its writer thought to assert. When these agree with the
code, what has been established is that the code and its author agree — which
is not evidence that either is right. **The defects nobody thought to look for
are, by construction, the ones no author-written check covers.**

The cost is justified by an asymmetry in how a false claim fails. This
project's output is a type that somebody's code will trust. If it says a
column is never null and the database sometimes returns null there, nothing
here goes red — the defect leaves as a type and arrives later, in a
stranger's program, as a value the type system said could not exist. Nothing
downstream catches it, which is why this particular expense is worth paying.

## The goal, stated exactly

Find claims that are false, and learn where the project is strong.

Both halves are the product. A mechanism that survived a dozen structurally
different attacks is worth writing down, because the next person who asks
"is that safe?" otherwise has to attack it all over again to find out.

What a sweep is not aimed at is coverage. Coverage counts what ran. A sweep
counts what broke — and a hundred probes that broke nothing have said
something about the code that no coverage figure can say.

## The input is a world and a query

A claim is never about a query alone. It is about a query asked of a
particular world: this table with this CHECK, that column generated from
another, a key declared here, a trigger on the write path. Change the world
and the same query earns different claims.

The standing suites cannot vary that. A shared corpus runs many queries
against ONE world by design — the world is expensive to stand up and
everything amortizes across it, which is what keeps the suite cheap enough to
run constantly.

**So the world is the axis a sweep exists to move, and the only instrument
that can move it.** A sweep that only writes queries is working ground that is
already covered. The question worth asking has the shape *what if I had this
constraint, and this generated column, and this query over them* — and two
thirds of it is unreachable from any standing corpus.

## Beginning: count the corpus, then choose

A sweep opens by counting what the standing corpus already contains, because
the gaps are where the unknown is and they are not guessable. The counts are
regenerated at the start of every run and belong to that run — never copied
into prose, here or anywhere.

Four of them need no judgement at all.

**Depth.** How many statements sit at each nesting level of the join tree. A
recursive walk is stressed by depth, so a corpus with a thin tail is one that
has never asked its fixpoints a hard question.

**Depth patterns.** The ORDERED chain of join types from outermost inward. An
outer join under an inner one is a different question from the reverse,
because what each does to row presence composes in one direction only. Count
distinct chains, not distinct joins.

**Statement kind.** Writing statements against reads. Writes carry claim
surfaces reads do not have — written values, returned rows, arms — and they
are always the minority.

**Common table expressions.** Count per statement, and the kinds: recursive,
nested, materialization hints, and bodies that are themselves writes.

The last two are about the WORLD rather than the query, and they are where a
taxonomy would rot. Do not invent one. Count structural facts the catalog can
answer for itself.

**Constraint shape.** How many columns one CHECK reads; how many CHECKs read
one column; whether the constraints on a table share columns, which is what
makes a chain of them transitive. Additivity and transitivity are the
interesting axes, and both are countable without anyone deciding what KIND a
constraint is.

**Generated column shape.** How many exist, and how many read a column that a
CHECK constrains — the case where a claim about the generated column depends
on reasoning about something else.

Diffing the corpus against a borrowed one answers a different question and is
worth running beside these: it finds constructs nobody here has ever written,
where the counts above find shapes nobody has ever composed. Neither sees the
other's gaps.

**What the counts are not.** All of them measure the INPUT. A corpus can score
well on every one and still leave the engine's own decisions unexercised, so
read them beside the instruments that count which decisions actually fired. A
gap that lines up with a decision nothing reaches is worth building; a gap
that lines up with nothing is decoration.

## Choosing what to attack

This is the hardest decision in the whole exercise, and the one most often
made badly, because the appealing answers are the ones that feel productive:
attack the newest code, attack what changed this week, attack whatever was
just fixed.

Those work once. The trouble is that they name a DIFF rather than a QUESTION.
A diff is exhausted the moment it has been attacked, so the next sweep has to
wait for more code and finds less each time.

**Aim a sweep at a question about the system, not at a changelog.** *Are the
enumerated lists complete? Does this resolver answer for the same universe
PostgreSQL does? Which claims here have never been executed by anything?*
Questions like these stay open after the sweep, and they aim at properties
rather than at authors.

Three things about where defects actually sit:

**Position predicts defects better than age.** A defect in the decision about
what a thing PRODUCES is worse than a defect in one flag, because a wrong
column list misassigns every claim after it. Attack where a wrong answer
contaminates the rest.

**A claim nobody has to defend is where the rot is.** Anything that asserts
something negative and never executes — a comment, a doc, a recorded
impossibility — cannot be falsified by any suite, so it survives being wrong
indefinitely. That surface is not code, and it is a legitimate axis.

**A new sweep needs a new argument.** "There is more code now" is not one. If
the honest reason is that the last sweep was interesting, say so, and pick
something else to do.

What comes out of this decision is the CHARTER: a short written statement of
the question, the surface it implies, the boundaries that are out of scope,
and a PREDICTION of where the findings will be. It is written before the
first probe, and the prediction is the point — a charter that could not have
been wrong taught nothing by being right.

## What counts as a finding

Rank findings on one ladder, decide the ladder before starting, and keep it
fixed for the whole session — otherwise a run that found several small things
reads afterwards like a run that found a big one.

Worst first:

**A false claim.** The code asserts a value is never null; a row comes back
with null there. The emitted type would lie to a user. Everything below this
is less serious, and it is not close.

**A wrong shape.** The list of output columns differs from the database's.
Worse than it sounds — every claim past the divergence is attached to the
wrong column.

**A false claim about inputs.** An input the code says is safe, rejected; an
input it says is rejected, accepted.

**A crash.** Anything thrown that is not a deliberate, recorded refusal.

**Self-disagreement.** Two paths that must give the same answer, and don't.
No data is needed to convict — run both on everything.

**Imprecision.** Conservative where a proof was available. Sound, so not a
bug. Record it and move on; chasing it during a sweep spends the session on
the cheapest thing in it.

Two things that are NOT findings. **A conservatism already written down** —
read the recorded boundaries first, because re-finding them costs a session
and teaches nothing. And **nothing found is not a failure**; it is a result,
and it needs reporting as confidently as a defect would.

But **turning a recorded imprecision into a false claim is always a finding**,
and one of the better ones. It means the reason recorded for holding back was
itself wrong.

## The oracle

A sweep needs a referee the project does not control, because the whole
premise is that the project's own opinion is what is under suspicion.

**The database is the referee. Documentation is not.** Documentation
describes intent across versions; the question is always what THIS build
does.

A probe has one shape: run the code on a statement, execute the same
statement against data you seeded yourself, compare the two answers. One
statement, two authorities, no opinions.

**A probe that returned no rows proved nothing.** Nothing came back, so no
claim was contradicted. This is a negative result with an asterisk, never a
pass — and if such a probe is later copied into a permanent test, it becomes
a test that asserts nothing while looking like it asserts something.

**When the oracle does something impossible, suspect the oracle.** An
in-process database can be left in a poisoned state by an earlier probe, and
a poisoned backend answers confidently and wrongly. Re-run the surprising
probe in a fresh instance before believing it. Isolate the oracle, not the
code.

## Attacking

**Find, don't fix.** Fixing mid-sweep is the most expensive mistake available
and the one that feels most like progress. A fix closes the shape you just
found, which biases every later probe toward the neighbourhood you have
already cleared — and it moves the code out from under every attack you
already ran, so those results no longer describe anything.

**Count mechanisms, not queries.** Ten statements that break through one code
path are ONE finding. After a hit, name the mechanism it went through, then
deliberately go somewhere else.

**Attack the argument, not the code.** Wherever someone concluded that a
claim was safe, that argument is the surface — particularly arguments made
under pressure while fixing something else. Read the arguments before reading
the code they justify.

**Sweep every hand-written list against the thing it approximates.** A curated
list of names cannot be falsified from the inside: a missing entry does not
make anything wrong, it makes the rule silently not apply, so the older and
weaker claim survives and nothing goes red. Enumerate the real thing and diff
it. The permanent repair is to derive the list by execution and assert it
matches, making it a cache of a measurement rather than a recollection.

**Sweep every read of an external source for entries nobody wrote.** The
converse. A catalog returns rows the schema author never declared — copies,
inherited entries, machinery — and a reader assuming one row per declaration
is wrong without ever looking wrong.

**Compose.** The richest defects need two mechanisms at once, and no
single-mechanism probe reaches them. Once the individual sections are
attacked, spend the remaining budget on pairs.

## Recording, while it happens

Findings go into quarantine: somewhere the normal suites do not read, holding
the data that falsified the claim and the mechanism you suspect, written to be
executed later by whoever fixes it.

**The suite stays green for the entire sweep.** That is what quarantine is
for. A red suite during a find-don't-fix phase is a suite nobody can use to
tell whether the next probe broke something.

Negative results are written down as they happen, in the same detail as
findings: the shape attacked, and the reason it held.

**Record what you did NOT sweep.** A section with no findings and a section
nobody opened produce identical silence in a report, and the second one is
dangerous, because silence reads as coverage.

## The shape of what a sweep produces

A finding is recorded as a self-contained WORLD, not as a query bolted onto a
shared one. A world is a directory holding a schema, the data that populates
it, and the fixtures that ask questions of it — so everything needed to
understand the finding sits in one place, and nothing outside it is disturbed.

**Keep a world small and pointed.** It exists to make ONE situation reachable.
A world carrying constructs the finding does not need is a world whose failure
has more than one possible cause.

**Data is written by hand, with the world.** The rows are the interesting
part: they make the query return the row that exposes the claim, and put a
NULL where the claim says one can appear. Generated data earns its place where
breadth is unknowable by any single author; inside a small world the author
knows every table, so writing rows beats configuring something to write them.

**The obligation on the data is unchanged: every nullable claim needs a NULL
to appear, or a recorded reason why it cannot.** That is what reports
inadequate data instead of leaving it to be noticed — and a fixture whose
query returns no rows has proved nothing and has to say so.

**Fixtures record the claims the code makes TODAY**, wrong ones included, for
as long as the sweep runs. Correcting them belongs to the fix phase.

**The cost is the world, not the schema.** Standing up a database dominates;
the size of the schema inside it barely registers. So fixtures needing the
same world share one — which is the argument for grouping them in a directory
rather than letting each fixture name its own.

## What the world has to contain

Five requirements. A machine can check four of them.

**A world models something real, and reads that way.** Named tables, named
columns, a domain a person could describe out loud. This is the rule nothing
enforces and the one that matters most: a world of single-letter tables makes
it impossible to see whether a claim is PLAUSIBLE, and a fixture nobody can
judge by reading is one only its author can review.

**Every table with more than two non-key columns carries at least one CHECK.**
Key columns are structure; the rest are where the constraints that reach
nullability live. A table without one contributes rows and nothing else.

**Several CHECKs on one column are a goal, not an accident.** Two constraints
on the same column must be read together before anything follows, which
exercises accumulation rather than lookup.

**Constraints that chain are a goal.** One constraint bounding a column that
another constraint reads is what makes a conclusion transitive — reached
through a step rather than read off a single fact.

**Generated columns over constrained columns are a goal**, especially where
the generated column's own nullability is not simply inherited from what it
reads. That is where the claim depends on the constraint reasoning holding,
and it is unreachable in a world of independent columns.

Then query it hard: nested joins, common table expressions and function calls,
at depths the standing corpus does not reach. A world built to these rules and
queried shallowly has spent its cost and bought nothing.

## Stopping

Decide the stop condition before starting, and make it a condition that can
actually arrive: every part of the named surface attacked with at least three
structurally different shapes, plus one open-ended session beyond the plan
that turns up nothing new.

"Out of ideas" is not a stop condition by itself. It arrives too early, and
it arrives at a different time for every person.

## Grading the sweep

A sweep reports on itself, and two comparisons do that work. Both belong in
the report and nowhere permanent — they describe a run, and they are stale as
soon as the next one happens.

**Findings per probe, against the previous sweep's.** Rising means the axis
is live. Falling means it is mined out, and the report has to say so. This is
the number that eventually retires the instrument, so the sweep that produces
it should not be the one that flinches from it.

**How many findings landed outside the surface the charter named.** This
grades the CHARTER, not the code. A sweep whose findings were mostly
elsewhere was carried by the attacker's judgement rather than by the plan,
and the next charter should be written differently — which is worth more than
the findings were.

## The fix phase, and what survives

Fixing is a separate phase, and it inherits none of the sweep's posture. Two
of its obligations are easy to skip and expensive to skip:

**Every quarantined finding graduates into a permanent test with corrected
claims.** A finding that is fixed but not graduated is a defect that can come
back silently.

**A world graduates whole and stays its own directory.** Folding its schema
into a shared one spends the isolation that made the finding legible, and
grows the shared world on behalf of everyone who never needed it.

**The CONTROLS graduate too** — the probes that behaved correctly around the
defect. A soundness fix can overshoot: it can stop making the false claim by
no longer making the true one either, and nothing in the suite can see the
difference. The controls are what fails when that happens.

**A defect class found three times is not a sweep result any more. It is a
missing gate.** Give it something that executes and owns it, and stop
rediscovering it by hand.

Then the sweep dissolves. **The charter and the report are episode documents.
They describe a session, they are stale the moment the fixes land, and they
do not belong in the permanent documentation.** What survives a sweep is
fixtures that run, gates that fail, and open items carrying triggers. A sweep
that produced nothing in one of those three forms produced nothing.
