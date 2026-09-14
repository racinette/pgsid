---
description: query-analysis tests organized by provenance and authorship
---

This directory combines several distinct sources of evidence for pgsid's query
analysis. Keep their policies local: a hand-authored contract, a mechanically
generated query, and an upstream corpus do not have the same authoring rules.

- `fixtures/` is the hand-authored corpus over the shared fixture schema.
- `worlds/` is the hand-authored corpus whose schemas and data vary by world.
- `generated/` constructs a mechanical corpus from explicit query-shape axes.
- `pg-regress/` adapts PostgreSQL's regression corpus for replay.
- `sqlc-corpus/` is a pinned borrowed corpus with separately recorded pgsid
  adjudications.
- `fixture-data/` builds the shared data states used to witness claims.
- `value-lineage/` is the hand-authored corpus for positional value provenance
  and transformation contracts.

TypeScript harnesses at this level orchestrate and compare those corpora. Read
the nearest generated `AGENTS.md` before changing a corpus: provenance and
whether a file may be authored by hand are directory-local facts.
