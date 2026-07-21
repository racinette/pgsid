import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import {
  parseSql,
  getFunctionBody,
  getFunctionName,
  getFunctionArgTypes,
  formatFunctionRef,
  getFunctionLanguage,
} from "../../src/ast.js";

// ---------------------------------------------------------------------------
// Helper: create a function from migration SQL, introspect it, parse both
// sides with libpg-query, and return all comparison data.
// ---------------------------------------------------------------------------

type CompareResult = {
  prosrc: string;
  bodyFromDef: string | undefined;
  bodyFromMig: string | undefined;
  refFromDef: string | undefined;
  refFromMig: string | undefined;
  argTypesFromDef: string[];
  argTypesFromMig: string[];
  langFromDef: string | undefined;
  langFromMig: string | undefined;
  byteSearchFound: boolean;
};

async function compare(pg: PGlite, createSql: string): Promise<CompareResult> {
  // Parse the migration SQL.
  const migParsed = await parseSql(createSql);
  const migStmt = migParsed.stmts![0]!.stmt!;
  const migName = getFunctionName(migStmt);
  const proname = migName?.name!;
  const schema = migName?.schema ?? "public";
  const migRef = formatFunctionRef(migStmt);

  // Introspect from pg_proc.
  const intro = await pg.query(
    "SELECT prosrc, pg_get_functiondef(p.oid) AS def " +
    "FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace " +
    "WHERE n.nspname = $1 AND p.proname = $2",
    [schema, proname],
  );

  // Match by formatFunctionRef; fall back to body match (e.g. unqualified schema).
  let prosrc = "";
  let defStmt: any = null;
  for (const row of intro.rows) {
    const defParsed = await parseSql(row.def);
    const ds = defParsed.stmts![0]!.stmt!;
    if (formatFunctionRef(ds) === migRef) {
      prosrc = row.prosrc;
      defStmt = ds;
      break;
    }
  }
  if (!defStmt) {
    const migBody = getFunctionBody(migStmt);
    for (const row of intro.rows) {
      if (row.prosrc === migBody) {
        prosrc = row.prosrc;
        const defParsed = await parseSql(row.def);
        defStmt = defParsed.stmts![0]!.stmt!;
        break;
      }
    }
  }
  if (!defStmt) throw new Error(`No matching function found for ${migRef ?? proname}`);

  return {
    prosrc,
    bodyFromDef: getFunctionBody(defStmt),
    bodyFromMig: getFunctionBody(migStmt),
    refFromDef: formatFunctionRef(defStmt),
    refFromMig: migRef,
    argTypesFromDef: getFunctionArgTypes(defStmt),
    argTypesFromMig: getFunctionArgTypes(migStmt),
    langFromDef: getFunctionLanguage(defStmt),
    langFromMig: getFunctionLanguage(migStmt),
    byteSearchFound: Buffer.from(createSql, "utf8").indexOf(prosrc, 0, "utf8") !== -1,
  };
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

type Case = {
  id: string;
  label: string;
  createSql: string;
  expectByteSearch: boolean;
};

const cases: Case[] = [
  // --- Argument formatting ---
  {
    id: "fmt_normal",
    label: "arg formatting: normal",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.fmt_normal(a int, b text) RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  RETURN a + 1;
END;
$$;`,
  },
  {
    id: "fmt_newlines",
    label: "arg formatting: newlines between args",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.fmt_newlines(
  a int,
  b text
) RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  RETURN a + 1;
END;
$$;`,
  },
  {
    id: "fmt_tabs",
    label: "arg formatting: tabs between args",
    expectByteSearch: true,
    createSql: "CREATE FUNCTION public.fmt_tabs(\n\t\ta int,\n\t\tb text\n\t) RETURNS int LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN a + 1;\nEND;\n$$;",
  },
  {
    id: "fmt_block_comment",
    label: "arg formatting: block comments between args",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.fmt_block_comment(a int /* first */, b text /* second */) RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  RETURN a + 1;
END;
$$;`,
  },
  {
    id: "fmt_line_comment",
    label: "arg formatting: line comments after args",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.fmt_line_comment(
  a int, -- the first arg
  b text -- the second arg
) RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  RETURN a + 1;
END;
$$;`,
  },
  {
    id: "fmt_extra_spaces",
    label: "arg formatting: extra spaces",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION   public.fmt_extra_spaces(  a   int  ,  b   text  )   RETURNS   int   LANGUAGE   plpgsql   AS   $$
BEGIN
  RETURN a + 1;
END;
$$;`,
  },

  // --- Built-in argument types ---
  {
    id: "builtin_types",
    label: "built-in argument types (25+ types)",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.builtin_types_fn(
  a int, b bigint, c smallint, d text, e varchar, f char,
  g boolean, h numeric, i real, j double precision,
  k timestamptz, l timestamp, m date, n time, o interval,
  p jsonb, q json, r uuid, s bytea, t inet, u cidr,
  v int[], w text[], x boolean[], y oid, z money
) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN a::text;
END;
$$;`,
  },

  // --- Custom types ---
  {
    id: "custom_types",
    label: "custom types: enum, composite, domain",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.custom_types_fn(
  m mood, c point2d, p posint, e email_t
) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN m::text;
END;
$$;`,
  },

  // --- Argument modes ---
  {
    id: "modes_fn",
    label: "argument modes: IN, OUT, INOUT, VARIADIC",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.modes_fn(
  IN x int, OUT y int, INOUT z int, VARIADIC v int[]
) LANGUAGE plpgsql AS $$
BEGIN
  y := x;
  z := x + z;
END;
$$;`,
  },

  // --- Default values ---
  {
    id: "default_args",
    label: "default argument values",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.default_args_fn(a int DEFAULT 0, b text DEFAULT 'x') RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  RETURN a;
END;
$$;`,
  },

  // --- Polymorphic types ---
  {
    id: "poly_types",
    label: "polymorphic argument types (anyelement)",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.poly_fn(a anyelement) RETURNS anyelement LANGUAGE sql AS $$
  SELECT a;
$$;`,
  },

  // --- Body formatting (plpgsql) ---
  {
    id: "body_tagged",
    label: "body: tagged dollar quote ($body$)",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.body_tagged(a int) RETURNS int LANGUAGE plpgsql AS $body$
BEGIN
  RETURN a + 1;
END;
$body$;`,
  },
  {
    id: "body_nested",
    label: "body: nested $$ inside tagged dollar quote",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.body_nested(a int) RETURNS text LANGUAGE plpgsql AS $outer$
BEGIN
  RETURN 'hello $$ world';
END;
$outer$;`,
  },
  {
    id: "body_weird_ws",
    label: "body: tabs and extra whitespace in body",
    expectByteSearch: true,
    createSql: "CREATE FUNCTION public.body_weird_ws(a int) RETURNS int LANGUAGE plpgsql AS $$\n\t\tBEGIN\n\t\t\t\tRETURN\t\ta\t+\t1;\n\t\tEND;\n\t$$;",
  },
  {
    id: "body_comments",
    label: "body: SQL comments inside body",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.body_comments(a int) RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  -- line comment
  /* block comment */
  RETURN a + 1;
END;
$$;`,
  },

  // --- Body formatting (sql) ---
  {
    id: "body_sql_dollar",
    label: "sql body: dollar-quoted",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.body_sql_dollar(a int) RETURNS int LANGUAGE sql AS $$
  SELECT a + 1;
$$;`,
  },
  {
    id: "body_sql_single",
    label: "sql body: single-quoted simple",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.body_sql_single(a int) RETURNS int LANGUAGE sql AS 'SELECT a + 1';`,
  },
  {
    id: "body_sql_escaped",
    label: "sql body: single-quoted with embedded '' (edge case)",
    expectByteSearch: false,
    createSql: `CREATE FUNCTION public.body_sql_escaped() RETURNS text LANGUAGE sql AS 'SELECT ''hello''::text';`,
  },
  {
    id: "body_sql_multi",
    label: "sql body: multiple statements",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.body_sql_multi() RETURNS void LANGUAGE sql AS $$
  INSERT INTO multi_stmt_test VALUES (1);
  INSERT INTO multi_stmt_test VALUES (2);
$$;`,
  },

  // --- Return types ---
  {
    id: "ret_setof",
    label: "returns setof",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.ret_setof_fn() RETURNS SETOF int LANGUAGE sql AS $$
  SELECT 1 UNION SELECT 2;
$$;`,
  },
  {
    id: "ret_table",
    label: "returns table",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.ret_table_fn() RETURNS TABLE (x int, y text) LANGUAGE sql AS $$
  SELECT 1, 'hello';
$$;`,
  },

  // --- Unqualified schema ---
  {
    id: "unqualified",
    label: "unqualified schema (no public. prefix)",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION unqualified_fn(a int) RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  RETURN a + 1;
END;
$$;`,
  },

  // --- Extra options ---
  {
    id: "extra_options",
    label: "extra options: SECURITY DEFINER, IMMUTABLE, STRICT",
    expectByteSearch: true,
    createSql: `CREATE FUNCTION public.extra_options_fn(a int) RETURNS int LANGUAGE sql IMMUTABLE STRICT SECURITY DEFINER AS $$
  SELECT a + 1;
$$;`,
  },

  // --- Procedures ---
  {
    id: "proc_plpgsql",
    label: "procedure: plpgsql body",
    expectByteSearch: true,
    createSql: `CREATE PROCEDURE public.proc_plpgsql_fn(a int) LANGUAGE plpgsql AS $$
BEGIN
  PERFORM a;
END;
$$;`,
  },
  {
    id: "proc_sql",
    label: "procedure: sql body",
    expectByteSearch: true,
    createSql: `CREATE PROCEDURE public.proc_sql_fn(a int) LANGUAGE sql AS $$
  SELECT a;
$$;`,
  },
  {
    id: "proc_custom",
    label: "procedure: custom type args",
    expectByteSearch: true,
    createSql: `CREATE PROCEDURE public.proc_custom_fn(m mood, p posint) LANGUAGE plpgsql AS $$
BEGIN
  PERFORM m::text;
END;
$$;`,
  },
];

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("AST comparison: introspection vs migration", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec("SET check_function_bodies TO off;");
    // Custom types and a table for multi-statement SQL body test.
    await pg.exec("CREATE TYPE mood AS ENUM ('sad', 'ok', 'happy')");
    await pg.exec("CREATE TYPE point2d AS (x float8, y float8)");
    await pg.exec("CREATE DOMAIN posint AS int CHECK (value > 0)");
    await pg.exec("CREATE DOMAIN email_t AS text CHECK (value ~ '@')");
    await pg.exec("CREATE TABLE multi_stmt_test (id int)");
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  // Generate one test per case. Each test creates the function, introspects,
  // parses both sides, and asserts all comparison properties.
  for (const c of cases) {
    it(c.label, async () => {
      await pg.exec(c.createSql);
      const r = await compare(pg, c.createSql);

      // Log the comparison data for visibility.
      console.log(`\n  [${c.label}]`);
      console.log("    ref(def):    ", r.refFromDef);
      console.log("    ref(mig):    ", r.refFromMig);
      console.log("    body(def):   ", JSON.stringify(r.bodyFromDef)?.slice(0, 100));
      console.log("    body(mig):   ", JSON.stringify(r.bodyFromMig)?.slice(0, 100));
      console.log("    prosrc:      ", JSON.stringify(r.prosrc)?.slice(0, 100));
      console.log("    argTypes(def):", r.argTypesFromDef);
      console.log("    argTypes(mig):", r.argTypesFromMig);
      console.log("    lang(def):   ", r.langFromDef, " lang(mig):", r.langFromMig);
      console.log("    byteSearch:  ", r.byteSearchFound, "(expected:", c.expectByteSearch, ")");

      // Core assertions.
      expect(r.bodyFromDef).toBe(r.prosrc);
      expect(r.bodyFromMig).toBe(r.prosrc);
      expect(r.bodyFromDef).toBe(r.bodyFromMig);
      expect(r.refFromDef).toBe(r.refFromMig);
      expect(r.argTypesFromDef).toEqual(r.argTypesFromMig);
      expect(r.langFromDef).toBe(r.langFromMig);
      expect(r.byteSearchFound).toBe(c.expectByteSearch);
    });
  }

  // --- Overloads ---
  describe("overloads: same name, different arg types", () => {
    beforeAll(async () => {
      await pg.exec("CREATE FUNCTION public.ovl(x int) RETURNS int LANGUAGE sql AS $$ SELECT x + 1; $$;");
      await pg.exec("CREATE FUNCTION public.ovl(x text) RETURNS text LANGUAGE sql AS $$ SELECT x || '!'; $$;");
    });

    it("ovl(int) matches", async () => {
      const sql = "CREATE FUNCTION public.ovl(x int) RETURNS int LANGUAGE sql AS $$ SELECT x + 1; $$;";
      const r = await compare(pg, sql);
      expect(r.bodyFromDef).toBe(r.prosrc);
      expect(r.bodyFromMig).toBe(r.prosrc);
      expect(r.refFromDef).toBe(r.refFromMig);
      expect(r.byteSearchFound).toBe(true);
    });

    it("ovl(text) matches", async () => {
      const sql = "CREATE FUNCTION public.ovl(x text) RETURNS text LANGUAGE sql AS $$ SELECT x || '!'; $$;";
      const r = await compare(pg, sql);
      expect(r.bodyFromDef).toBe(r.prosrc);
      expect(r.bodyFromMig).toBe(r.prosrc);
      expect(r.refFromDef).toBe(r.refFromMig);
      expect(r.byteSearchFound).toBe(true);
    });
  });
});
