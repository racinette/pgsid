---
description: one directory per borrowed sqlc PostgreSQL case
---

Every case keeps sqlc's schema, query, configuration, and extracted expected
IR verdicts together. Optional pgsid-owned data.sql supplies executable witness
rows; optional adjudication.json records conclusions about observed
disagreements.

Do not edit an upstream-owned file to make pgsid pass. Fix the engine, record a
PostgreSQL-backed adjudication, or refresh the pinned corpus according to the
root provenance document.
