# CHECK validation across writes

A CHECK expression describes a candidate database row. Query parameters are
not that row: an assignment can apply a cast or expression, an omitted column
can receive a default, and a generated column can depend on other columns.
The write path must produce a partial candidate row before calling the CHECK
evaluator. A known SQL null, a known value, and an unknown value remain
distinct. When a value cannot be reproduced in the target language, the
evaluator leaves the affected result uncertain and PostgreSQL decides.

The row validator evaluates constraints against the row it receives. The
query adapter interprets assignments and decides when the row is available.
For a single-row insert with a portable expression, it can evaluate the
expression from query inputs. A default that depends on database state stays
unknown. An update may need the previous row and may affect no rows, so a
parameter alone does not justify rejecting the update before it executes.

## Row-rewriting triggers

PostgreSQL applies row-level BEFORE triggers before testing the resulting row
against table CHECK constraints. A trigger can change a value or skip the row.
Target-language evaluation sees the row before that trigger unless the
application supplies the row after it. A preflight failure can therefore
disagree with PostgreSQL, and a preflight pass cannot certify the final row.

Generated CHECK validation remains enabled by default when a BEFORE trigger
exists. Generation emits a warning identifying the affected table and write
operation so the user can review whether the trigger changes the checked
values. Trigger introspection identifies the presence and timing of a trigger;
it does not establish which columns its function modifies. The warning does
not change the generated checks or prevent database validation.

## Granular control

Configuration needs separate control over generated evaluators and their
automatic use in query wrappers. Keeping an evaluator available is useful
when a caller can provide a trustworthy row even if a query wrapper cannot.
Both controls should apply consistently to every generated target language.

An evaluator exclusion can name a table, domain, or individual constraint.
A column exclusion removes each constraint that reads that column; a
multi-column constraint cannot be split into independent constraints. An
automatic-use exclusion can name a table, constraint, column, or query while
leaving the corresponding evaluator available for explicit calls. A column
exclusion at this boundary likewise skips the whole dependent constraint.
Selectors should use catalog identities and report unmatched names so a
misspelling does not silently leave validation enabled.

The presence of a BEFORE trigger never infers a safe subset of columns.
Users can use the warning to inspect the trigger and choose the narrowest
exclusion that matches its behavior. The default remains enabled, with the
database as the final authority for every write.
