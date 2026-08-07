// Round 4 — free-form: JSON_TABLE / XMLTABLE column lists, ROWS FROM naming,
// and the third route to an unrecorded join.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay')`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO sw4_r (rid, id, v) VALUES (100, 1, 'x')`,
  `INSERT INTO trow_holder (id, rows, row1) VALUES (1, ARRAY[ROW(1,'z')::trow], ROW(2,'y')::trow)`,
];

const probes: Probe[] = [
  {
    id: "C32-nested-using-empty-side",
    note: "the nested-USING route, with the inner join's other side empty",
    sql: `SELECT c.id FROM orders o LEFT JOIN
            (customers c JOIN (sw4_r r JOIN sw4_c x USING (id)) USING (id))
            ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "FF13-jsontable-sibling-nested-ordinality",
    note: "two sibling NESTED paths: each path's rows leave the OTHER path's columns NULL",
    sql: `SELECT * FROM JSON_TABLE('{"a":[1,2],"b":[3]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY, av integer PATH '$'),
            NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY, bv integer PATH '$')))`,
  },
  {
    id: "FF14-jsontable-sibling-not-null",
    note: "the same with a column declared NOT NULL",
    sql: `SELECT * FROM JSON_TABLE('{"a":[1,2],"b":[3]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (av integer PATH '$' NOT NULL),
            NESTED PATH '$.b[*]' COLUMNS (bv integer PATH '$')))`,
  },
  {
    id: "FF15-jsontable-top-ordinality-control",
    note: "control: a top-level FOR ORDINALITY over a single path",
    sql: `SELECT * FROM JSON_TABLE('[10,20]'::jsonb, '$[*]' COLUMNS (
            n FOR ORDINALITY, v integer PATH '$'))`,
  },
  {
    id: "FF16-jsontable-nested-single",
    note: "one NESTED path only — nothing to leave NULL",
    sql: `SELECT * FROM JSON_TABLE('{"a":[1,2]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY, av integer PATH '$')))`,
  },
  {
    id: "FF17-jsontable-nested-empty-array",
    note: "a NESTED path whose array is EMPTY, beside one that is not",
    sql: `SELECT * FROM JSON_TABLE('{"a":[],"b":[3]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY, av integer PATH '$'),
            NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY, bv integer PATH '$')))`,
  },
  {
    id: "FF18-xmltable-ordinality-notnull",
    note: "XMLTABLE's FOR ORDINALITY and a NOT NULL column",
    sql: `SELECT * FROM XMLTABLE('/r/i' PASSING '<r><i><a>1</a></i><i><a>2</a></i></r>'::xml
            COLUMNS n FOR ORDINALITY, a integer PATH 'a' NOT NULL)`,
  },
  {
    id: "FF19-rowsfrom-single-alias-name",
    note: "ROWS FROM with ONE function and an alias: does the alias name the column?",
    sql: `SELECT * FROM ROWS FROM (generate_series(1, 2)) AS z`,
  },
  {
    id: "FF20-plain-function-alias-name-control",
    note: "control: the lone-function spelling, where the alias DOES name the column",
    sql: `SELECT * FROM generate_series(1, 2) AS z`,
  },
  {
    id: "FF21-array-prepend-null-array",
    note: "a polymorphic call whose ARRAY position is a bare NULL",
    sql: `SELECT * FROM unnest(array_prepend(ROW('a',1)::sku_pair, NULL)) x`,
  },
  {
    id: "FF22-array-agg-ordered",
    note: "array_agg with an ORDER BY inside the call",
    sql: `SELECT * FROM unnest((SELECT array_agg(q.row1 ORDER BY q.id) FROM trow_holder q)) x`,
    seed: SEED,
  },
  {
    id: "FF23-array-agg-filter",
    note: "array_agg with a FILTER that admits nothing",
    sql: `SELECT * FROM unnest((SELECT array_agg(q.row1) FILTER (WHERE false) FROM trow_holder q)) x`,
    seed: SEED,
  },
  {
    id: "FF24-jsontable-nested-under-nested",
    note: "a NESTED path inside a NESTED path",
    sql: `SELECT * FROM JSON_TABLE('{"a":[{"c":[1,2]},{"c":[3]}]}'::jsonb, '$' COLUMNS (
            NESTED PATH '$.a[*]' COLUMNS (
              na FOR ORDINALITY,
              NESTED PATH '$.c[*]' COLUMNS (nc FOR ORDINALITY, cv integer PATH '$'))))`,
  },
];

await runProbes(probes);
