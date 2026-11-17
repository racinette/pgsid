# Vendor inputs

Data copied from the PostgreSQL source tree, which the CHECK evaluator's
generated tables are built from:

- `postgresql-timezone`: the compiled-in time zone database and the default
  abbreviation set, read by `scripts/generate-check-timezone-data.sh`.
- `postgresql-unicode`: the Unicode category and normalization tables, read by
  `scripts/generate-check-unicode-data.sh`.

PGlite and its `plpgsql_check` extension are ordinary npm dependencies.
