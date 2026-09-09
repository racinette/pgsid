---
description: a pinned sqlc corpus with pgsid-owned witness adjudications
---

This is a borrowed corpus vendored from sqlc's PostgreSQL end-to-end testdata.
Read PROVENANCE.md before refreshing it. Upstream schema, query, config, and
expected files remain attributable to the pinned sqlc release.

The exceptions are explicit: per-case data.sql and adjudication.json, and the
root tickets/ directory, are pgsid-owned. A refresh must preserve them and must
not blur borrowed expectations with conclusions adjudicated against PostgreSQL.
