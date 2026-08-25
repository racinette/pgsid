# The claims sweep — 2026-08-25

## Why this and not a fifth adversarial sweep

The register refuses one, by name:

> **Chartering adversarial sweeps against CODE AGE.** … A fifth sweep needs a
> new argument, and "the code has grown again" is not one.
> — `docs/deferred-tasks.md`, "Decided against"

Yields back that up: sweep 2 found 13 in ~120 probes, sweep 3 found 8 in ~155,
sweep 4 found 7 in 169. Sweep 4's own conclusion was that the discriminating
variable is POSITION, not age — five of its seven were FROM items — and the
pg-regress replay then swept that axis with 11404 analysed statements, paid 7
defects, and came back clean. The endorsed axis is freshly mined out.

The new argument is that the yield has moved somewhere no instrument looks.
Three of this session's four findings came from a maintainer question; the
fourth came from falsifying a sentence *this project had written an hour
earlier*. So the target is the project's own prose.

The surface, measured before starting:

    556  lines in tests/unit/query/fixtures/*.sql   asserting a negative
    486  lines in src/**/*.ts comments                     ”
    253  lines in docs/*.md                                ”

None of it executes. And the register already knows the failure mode — it
deleted 89% of itself on 2026-08-21 after finding three wrong claims in a day:

> **An entry about what the ENGINE DOES rots. An entry about what the CODEBASE
> IS holds.** … success expires the record, and no suite goes red.

That rule had never been applied outside `deferred-tasks.md`.

---

## Finding 1 — the witness census counted six claims as annotated that are not

`nullability-soundness.test.ts` prints the corpus census. It said:

    nullable claims: 793 — 769 witnessed (97%), 24 unwitnessed with the
                     reason recorded

and `WITNESS_REPORT=1` listed **eighteen**. The count is a subtraction; the
list is the array. They had drifted apart, and the missing six are the
`@no-rows` fixtures:

```ts
} else if (!fixture.noRowsReason) {
  unwitnessed.push(`${label} — ${fixture.unwitnessable.get(i) ?? "UNCLASSIFIED"}`);
  if (!fixture.unwitnessable.has(i)) unclassified.push(label);
}
// ← a claim inside a @no-rows fixture fell out of the world here
```

The exemption itself is right — a statement that returns no row can witness
nothing. What was wrong is calling those six "reason recorded" when they have
no reason: `cast-jsonb-scalar` columns 0–3, `extreme-cast-syntax-domain#4`,
`extreme-typecast-not-null-domain#4`. The number is the one that gets copied
into commit messages and into `docs/witness-coverage.md`, and it over-claimed
by six every time.

Captured RED first — `expected 18 to be 24` — then fixed by giving the
exemption its own bucket, its own line in the summary, and its own list under
`WITNESS_REPORT=1`:

    nullable claims: 793 — 769 witnessed (97%), 18 unwitnessed with the
                     reason recorded, 6 exempt (@no-rows)

The gate is the arithmetic across both buckets, mutation-checked: delete the
`exempt.push` and it dies with *"the summary count and the printed lists have
drifted apart: expected 18 to be 24"*.

## Finding 2 — "Current measurement" was a snapshot from nineteen days earlier

`docs/witness-coverage.md` is the document `docs/harness-strengthening-handoff.md`
calls "the map the next reader trusts", and the document
`docs/imprecision-closure.md` says "carries the current measurements". Under
the heading **## Current measurement**, undated, it held a table. Every number
in it was wrong:

| the table said | the run says |
|---|---|
| 410 fixtures | **593** |
| `notNull` claims 917 | **1212** |
| — guarded by a checked refusal 10 | **11** |
| `nullable` claims 627 | **793** |
| — witnessed 538 (86%) | **769 (97%)** |
| — unwitnessed, reason recorded 89 | **18**, plus 6 exempt |
| except **the two** that declare `@no-rows` | **four** |

Nothing had drifted in the engine. Every number moved the good way — that is
the whole difficulty. **A copied number is falsified by success, and no suite
goes red when it is.**

The fix is the register's own rule rather than fresher numbers: the section no
longer carries a table, it carries the command that prints one.

## Finding 3 — a closability classification, falsified in the direction that matters

`docs/imprecision-closure.md` §D sorts 33 conservative-by-design claims into
four kinds and says:

> Four kinds, and only the first is closable by work already planned

Measured 2026-08-25, nineteen days of engine work later:

- **kind 1 — "the overload charter's material (4)", the one called closable.**
  One of four closed (`builtin-functions#4`, `upper`). `param-fn-overload#0`
  and `overload-consensus#1,#2` are still annotated today.
- **kind 2 — "curated-table coverage (2)".** Both closed. `stddev_pop` reads
  `notNull`; `pg_sleep(0)` left the fixture altogether.
- **kind 3 — "genuinely partial functions (5)"**, whose reason was *"No
  narrowing helps … closing these needs value analysis the engine does not
  do"*. **All five closed**, by exactly that value analysis:

```sql
date_part('year', o.placed_at)          -- @notNull   (was #10, "genuinely partial")
extract(day from i.iv)                  -- @notNull   (was #3)
array_length(ARRAY[p.id, p.id], 1)      -- @notNull   (was #1)
(ARRAY[c.id, c.id])[1]                  -- @notNull   (was #9)
p.id = ANY (string_to_array('1,2',',')::int[])  -- @notNull   (was #13)
```

So the kind declared closable is the one that mostly did not close, and seven
claims across two kinds declared not-closable did.

The register convicted **"closable, *if ever worth it*"** as reach dressed as
judgment. This is the same error with the sign flipped: **an impossibility
asserted where a measurement belonged.** It is not a lesser mistake — a
"closable" row costs a re-check, whereas "no narrowing helps" tells the next
reader to stop looking, and five columns proved that wrong.

The doc is a DISCHARGED handoff, so its text is left exactly as written under
a dated banner. A corrected document would not show the error.

---

## Negative results

Worth as much as the findings, and the reason the sweep stops here.

**The `@unwitnessable` mechanism is enforced, both directions.** Not prose —
an executing invariant, and the stale direction is the one that matters:

```ts
unwitnessed  →  annotated with a reason   (else this test fails)
witnessed    →  NOT annotated             (a stale reason must come off)
```

Three fixtures carry a comment recording that their own annotation was retired
this way. The mechanism works; Finding 1 was in the *report*, not the gate.

**The allowlists are empty and asserted empty.** `WRAP_ALLOWED = {}` in
`wrap-invariance.test.ts`, both directions checked; `SKIP_FILES = {}` in
`pg-regress.test.ts`. Nothing has quietly accumulated.

**The version pin holds.** Four places say `pgsql-deparser 18.1.1`; 18.1.1 is
installed. The three `@unwitnessable` reasons blocked on it are current.

**Three measured PostgreSQL claims re-measured true** at PGlite 0.5.4:

    nondet 'a' = 'A'                    → false    (ICU catalog-only, as recorded)
    NOT VALID + INSERT NULL             → raises   (still gates new writes)
    current_query() IS NULL             → false

**The contract gate really does run over the corpus** — `deferred-tasks.md`
§1's "all 515 fixtures" is decoration on an executed claim, not a substitute
for one: the suite walks every fixture every run and holds a floor.

**The four self-declared refusals read closely and are sound.** Three say so
themselves — *"If this column ever flips notNull, a gate has opened that the
charter keeps closed."* Those are guards, not notes.

---

## The pattern, for the next reader

All three findings are one shape, and it is not "the docs got old":

> **A number or a judgment was copied out of an instrument that re-derives it,
> and then outlived the instrument's answer.**

The tell is a sentence that would have to change when a fix lands, sitting
somewhere no fix touches. Finding 1 is the shape at its smallest — a count and
a list, six apart, inside a single function. Finding 3 is it at its largest — a
classification of what could never be closed, five-fifths wrong.

What follows from it:

- **A count in prose needs the command that regenerates it, or it should not
  be in prose.** `witness-coverage.md` now carries the command.
- **"Cannot" is a measurement, and it expires.** The rung and fallback censuses
  already say this about their dark entries — *"the measured reason it cannot
  be reached (which, per the project's rule, is the claim to re-test)"*. §D of
  the closure handoff did not, and that is exactly where the sweep landed.
- The `@unwitnessable` annotation is the pattern done RIGHT: the reason lives
  on the claim, and an executing invariant retires it when it stops being
  true. Where a claim can be attached to something that runs, attach it.

## Not swept

Recorded so the coverage is not read as total:

- **The 65 dark rungs and 40 dark fallback entries** were inventoried, not
  re-tested. Each is an impossibility claim with a measured reason, in three
  named categories. The DEFENSIVE category's own re-test trigger — *"if a
  consumer ever feeds the walk unprepared SQL"* — is worth watching now that
  `src/index.ts` exists.
- **The 486 negative claims in `src/` comments** were counted, not read. The
  register's rot modes 3 and 4 both landed in comments, so this is the largest
  unswept surface left.
- **`imprecision-closure.md` §D kind 4** ("mechanisms conservative by
  construction", 22 claims) was not enumerated against the live 18.
