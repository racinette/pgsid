---
description: mechanical query generation and its PostgreSQL-judged gates
---

This directory contains the generator and the suites that consume its corpus.
The corpus is produced mechanically from explicit structural axes; generated
queries are not hand-authored fixtures and must not acquire copied engine
expectations.

PostgreSQL remains the answer key. Change an axis, constructor, or survival
expectation in the generator source and let the suites regenerate the corpus.
Do not solve a generated failure by special-casing one emitted query.
