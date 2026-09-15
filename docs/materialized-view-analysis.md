# Materialized-view analysis

A materialized view exposes stored rows produced by its definition at the last
refresh. An ordinary view always reflects its current definition and current
dependencies; a materialized view can retain values produced before those
dependencies changed.

Value lineage follows both view kinds through their definitions. The
definition records how each stored value was produced even when a materialized
view has not been refreshed recently.

Nullability has a freshness choice. Definition analysis uses the current
definition and current catalog facts. It gives the strongest contracts and is
the default, matching projects that refresh materialized views after relevant
schema changes. Conservative analysis treats the materialized relation as a
storage boundary. It makes no nullability claim inherited from the definition.

The default applies to every materialized view and an exact, fully qualified
override takes precedence:

```yaml
sql:
  analysis:
    nullability:
      materializedViews:
        default: definition
        overrides:
          reporting.historical_rollup: conservative
```

Use `definition` when the project maintains the refresh invariant. Use
`conservative` for snapshots that may outlive changes which strengthen facts
about their source relations. Ordinary views are always analyzed through their
definitions and are unaffected by this setting.
