---
description: builders for the shared fixture corpus data states
---

This directory defines the reusable database states against which the
hand-authored shared-schema fixtures are executed. It is infrastructure for
witnessing contracts, not a query corpus and not a place for expected
nullability annotations.

Keep state construction deterministic and make each state's purpose legible:
empty, sparse, dense, uniform, and generated states exist to expose different
routes to NULL rather than to approximate production volume.
