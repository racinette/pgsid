import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { quoteContext } from './check-quote-fixtures.js'

const packet = 'artifacts/goal-checks/format-active'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const patterns = [
  null,
  '',
  'plain %',
  '%%',
  '%%s',
  '%s',
  '%I',
  '%L',
  '%2$s:%s',
  '%2$s:%1$s:%s',
  '%4$*1$s',
  '%*s',
  '%*2$s',
  '%1$*4$s',
  '%1$-*4$s',
  '%--8s',
  '%08s',
  '%1$08s',
  '%0s',
  '%0$s',
  '%*0$s',
  '%*01$s',
  '%*2s',
  '%$s',
  '%-s',
  '%-',
  '%1$',
  '%2147483648s',
  '%2147483647$L',
  '%2147483648',
  '%0000001$s',
  '%000s',
  '%3$*2$I',
  '%L %',
  '%1$I/%1$L',
  '%*s|%s',
  '%--*s',
  '%1$--4I',
  '%1$3-L',
  '%9$s',
  '%4$s|%1$s|%s',
  'é😊%1$5s雪',
  '%%1$s',
  '%+s',
  '%.2s',
  '%ls',
  '%*2147483648$s',
  '%1$*2$L',
  '%I|%s',
  '%2147483647s',
]
const inputs = [
  { a: 'alpha', b: 'select', c: "quote'\\", w: 3 },
  { a: '3', b: '雪', c: null, w: -4 },
  { a: null, b: 'lower', c: '', w: null },
  { a: 'bad', b: null, c: 'é😊', w: -2147483648 },
  { a: '-2', b: 'X', c: 'NULL', w: 0 },
]

it('matches format grammar, argument consumption, quoting, Unicode widths and native errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-format-grammar-'))
  try {
    await pg.exec(
      "CREATE TYPE format_label AS ENUM ('3','select');CREATE FUNCTION ignored_cast(format_label) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'cast'::text$$;CREATE CAST(format_label AS text) WITH FUNCTION ignored_cast(format_label);CREATE TYPE format_pair AS (n int,label text);",
    )
    const forms = [
      { name: 'format_expanded', output: 'format(pattern,a,b,c,w)' },
      { name: 'format_variadic', output: 'format(pattern,VARIADIC ARRAY[a,b,c,w::text])' },
      { name: 'format_null_array', output: 'format(pattern,VARIADIC NULL::text[])' },
      { name: 'format_empty_array', output: 'format(pattern,VARIADIC ARRAY[]::int[])' },
      { name: 'format_no_arguments', output: 'format(pattern)' },
      { name: 'format_vector', output: "format(pattern,VARIADIC '1 -2 3'::int2vector)" },
      { name: 'format_oidvector', output: "format(pattern,VARIADIC '1 2 3'::oidvector)" },
      {
        name: 'format_enum',
        output: "format(pattern,VARIADIC ARRAY['3'::format_label,NULL,'select'])",
      },
      {
        name: 'format_record',
        output:
          'format(pattern,VARIADIC ARRAY[ROW(NULL,NULL)::format_pair,NULL::format_pair,ROW(1,a)::format_pair])',
      },
    ]
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(pattern text,a text,b text,c text,w int,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!,
          name = form.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        const expression = portableCheckAtoms(lowered.expression)
        expect(hasUncertain(expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
          expression,
        })
      }
    const group = prepareCheckRustGroup(plans, { ...quoteContext, quoteAllIdentifiers: false })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    let inserts = 0
    for (const form of forms)
      for (const pattern of patterns)
        for (const input of inputs) {
          let value: string | null = null,
            code: string | undefined
          try {
            value = (
              await pg.query<{ value: string | null }>(
                `SELECT ${form.output} value FROM(SELECT $1::text pattern,$2::text a,$3::text b,$4::text c,$5::int w) args`,
                [pattern, input.a, input.b, input.c, input.w],
              )
            ).rows[0]!.value
          } catch (error) {
            code = (error as { code: string }).code
          }
          for (const wanted of code ? [null] : new Set([value, 'wrong', null])) {
            const expected: Outcome = code
              ? { kind: 'Error', value: { state: parseInt(code, 36) } }
              : { kind: wanted === value ? 'True' : 'False' }
            const insert = pg.query(`INSERT INTO ${form.name} VALUES($1,$2,$3,$4,$5,$6,false)`, [
              pattern,
              input.a,
              input.b,
              input.c,
              input.w,
              wanted,
            ])
            if (expected.kind === 'True') await insert
            else await expect(insert).rejects.toMatchObject({ code: code ?? '23514' })
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.name + '_' + origin,
                row: {
                  pattern: known(pattern),
                  a: known(input.a),
                  b: known(input.b),
                  c: known(input.c),
                  w: known(input.w),
                  expected: known(wanted),
                  bypass: known(false),
                },
                expected,
              })
          }
          observations.push({ form: form.name, pattern, input, value, code })
        }
    for (const form of forms)
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            pattern: { kind: 'Unknown' },
            a: { kind: 'Unknown' },
            b: { kind: 'Unknown' },
            c: { kind: 'Unknown' },
            w: { kind: 'Unknown' },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/grammar-evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/grammar-summary.json',
      JSON.stringify(
        { checks: names.length, fixtures: fixtures.length, inserts, observations },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'text_format_grammar', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})
