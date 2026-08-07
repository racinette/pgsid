// Round 8 — is the SIBLING test the right rule for JSON_TABLE's nested
// ordinality, or does the boundary sit one step wider?
//
// The report's finding 5 says a `FOR ORDINALITY` column is notNull when its
// path is the only one at its level, on two measurements: one NESTED path is
// sound (FF16) and NESTED-inside-NESTED is sound (FF24), "a child's rows all
// belong to one parent row". Both were measured over NON-EMPTY arrays, and
// the sibling case was falsified by exactly an empty one (FF17). So the two
// shapes that decide the rule are the ones nobody ran:
//
//   J1 — a LONE nested path over an EMPTY array. If the root row still comes
//        back with the ordinality NULL, "no sibling" does not save it.
//   J3 — a nested path INSIDE another whose inner array is empty for one
//        outer element. Same question one level down.
//
// If either emits a NULL, the sibling test is unsound and the conservative
// cut the report names as its fallback — any ordinality inside a NESTED path
// reads nullable — is the actual rule.
import { runProbes, type Probe } from "./harness.js";

const probes: Probe[] = [
  {
    id: "J1-lone-nested-empty-array",
    note: "ONE nested path, empty array — no sibling to be unioned against",
    sql: `SELECT j.na FROM JSON_TABLE('{"a":[]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY))) j`,
  },
  {
    id: "J2-lone-nested-nonempty",
    note: "the control: ONE nested path, non-empty (FF16 re-run)",
    sql: `SELECT j.na FROM JSON_TABLE('{"a":[1,2]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY))) j`,
  },
  {
    id: "J3-nested-in-nested-empty-inner",
    note: "NESTED inside NESTED, inner array EMPTY for one outer element",
    sql: `SELECT j.na, j.nb FROM JSON_TABLE('{"a":[{"c":[1]},{"c":[]}]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY,
              NESTED PATH '$.c[*]' COLUMNS (nb FOR ORDINALITY)))) j`,
  },
  {
    id: "J4-nested-in-nested-nonempty",
    note: "the control: NESTED inside NESTED, every inner array non-empty (FF24 re-run)",
    sql: `SELECT j.na, j.nb FROM JSON_TABLE('{"a":[{"c":[1]},{"c":[2]}]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY,
              NESTED PATH '$.c[*]' COLUMNS (nb FOR ORDINALITY)))) j`,
  },
  {
    id: "J5-root-ordinality-with-siblings",
    note: "a ROOT-level ordinality beside two NESTED siblings — counts root rows, not a path's",
    sql: `SELECT j.rn, j.na, j.nb FROM JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
            rn FOR ORDINALITY,
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
            NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j`,
  },
  {
    id: "J6-lone-nested-missing-key",
    note: "ONE nested path whose key is ABSENT from the document",
    sql: `SELECT j.na FROM JSON_TABLE('{"z":1}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY))) j`,
  },
  {
    id: "J7-lone-nested-plus-root-scalar",
    note: "ONE nested path over an empty array, beside a root scalar column",
    sql: `SELECT j.rv, j.na FROM JSON_TABLE('{"z":1,"a":[]}'::jsonb, '$' COLUMNS (
            rv integer PATH '$.z',
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY))) j`,
  },
];

await runProbes(probes);
