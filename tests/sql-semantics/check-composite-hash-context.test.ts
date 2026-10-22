import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves record hash context, strict seeds, ordered missing support and partial arguments', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-hash-context-'))
  try {
    await pg.exec(`CREATE TYPE pair AS(n int4,label text COLLATE "C");
CREATE TYPE custom AS(n int4);
CREATE TYPE wrong_range AS RANGE(subtype=int4);
CREATE TYPE wrong_holder AS(n int4,r wrong_range);
CREATE OPERATOR CLASS wrong_range_hash DEFAULT FOR TYPE wrong_range USING hash AS OPERATOR 1 <>(anyrange,anyrange),FUNCTION 1 hash_range(anyrange);
CREATE FUNCTION custom_hash(custom) RETURNS int4 LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT 17';
CREATE FUNCTION custom_compare(custom,custom) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT CASE WHEN ($1).n<($2).n THEN -1 WHEN ($1).n>($2).n THEN 1 ELSE 0 END';`)
    for (const [name, symbol] of [
      ['lt', '<'],
      ['le', '<='],
      ['eq', '='],
      ['ge', '>='],
      ['gt', '>'],
    ])
      await pg.exec(
        `CREATE FUNCTION custom_${name}(custom,custom) RETURNS bool LANGUAGE sql IMMUTABLE STRICT AS 'SELECT custom_compare($1,$2) ${symbol} 0';CREATE OPERATOR public.${symbol}(LEFTARG=custom,RIGHTARG=custom,FUNCTION=custom_${name});`,
      )
    await pg.exec(`CREATE OPERATOR CLASS custom_order DEFAULT FOR TYPE custom USING btree AS OPERATOR 1 public.<,OPERATOR 2 public.<=,OPERATOR 3 public.=,OPERATOR 4 public.>=,OPERATOR 5 public.>,FUNCTION 1 custom_compare(custom,custom);
CREATE OPERATOR CLASS custom_hash DEFAULT FOR TYPE custom USING hash AS OPERATOR 1 public.=,FUNCTION 1 custom_hash(custom);`)
    const forms = {
      portable: 'hash_record(ROW(n,NULL::text))::text',
      text: 'hash_record(ROW(n,label))::text',
      array: 'hash_array(ARRAY[ROW(n,label)::pair,NULL::pair])::text',
      extended: 'hash_record_extended(ROW(n,label),seed)::text',
      missing_after: 'hash_record(ROW(label,NULL::json))::text',
      missing_before: 'hash_record(ROW(NULL::json,label))::text',
      wrong_range: 'hash_record(ROW(n,NULL::wrong_range))::text',
      wrong_multirange: 'hash_record(ROW(n,NULL::wrong_multirange))::text',
      wrong_nested:
        'hash_record(ROW(CASE WHEN n IS NULL THEN NULL::wrong_holder ELSE ROW(n,NULL::wrong_range)::wrong_holder END))::text',
      custom:
        'hash_record(ROW(CASE WHEN n IS NULL THEN NULL::custom ELSE ROW(n)::custom END))::text',
      custom_array:
        'hash_array(ARRAY[CASE WHEN n IS NULL THEN NULL::custom ELSE ROW(n)::custom END])::text',
      custom_missing:
        'hash_record_extended(ROW(CASE WHEN n IS NULL THEN NULL::custom ELSE ROW(n)::custom END),seed)::text',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(n int4,label text COLLATE "C",seed int8,expected text,CONSTRAINT valid CHECK((${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"));`,
      )
    const catalog = await snapshotCatalog(pg),
      contexts: Record<string, CheckExecutionContext> = {
        little: { defaultCollation: 'C', serverEncoding: 'UTF8', nativeByteOrder: 'little' },
        unspecified: { defaultCollation: 'C', serverEncoding: 'UTF8' },
        encoding: { defaultCollation: 'C', nativeByteOrder: 'little' },
      },
      evaluators = [],
      names: string[] = [],
      checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = []
    for (const [context, settings] of Object.entries(contexts))
      for (const name of Object.keys(forms)) {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          expression = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            'stored',
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          prepared = prepareCheckRust(
            expression,
            { schema: 'public', kind: 'table', owner: name, constraint: context },
            settings,
          )
        expect(prepared.kind, name + ':' + context).toBe('supported')
        if (prepared.kind !== 'supported') throw Error(prepared.reason)
        evaluators.push(prepared.evaluator)
        names.push(name + '_' + context)
        checks.push({
          kind: 'supported',
          entryName: prepared.evaluator.entryName,
          inputs: prepared.evaluator.inputs,
        })
      }
    const evaluatorSource = evaluators.map((e) => e.source).join('\n'),
      group = {
        checks,
        evaluatorSource,
        requiresRegex: false,
        source: assembleCheckRust({
          source: evaluatorSource,
          callables: [...new Set(evaluators.flatMap((e) => e.callables))],
        }),
      },
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const known = (value: string | number | bigint | null) =>
      value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
    for (const sample of [
      { n: 2, label: 'snow😊', seed: 1n },
      { n: null, label: null, seed: 0n },
      { n: 1, label: 'abc', seed: null },
    ]) {
      for (const [name, sql] of Object.entries(forms)) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT ${sql} value FROM (SELECT $1::int4 n,$2::text COLLATE "C" label,$3::int8 seed) s`,
              [sample.n, sample.label, sample.seed?.toString() ?? null],
            )
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const context of Object.keys(contexts)) {
          const contextUnknown =
              context !== 'little' &&
              sample.label !== null &&
              !(context === 'encoding' && /^[\x00-\x7f]*$/.test(sample.label)) &&
              name !== 'portable' &&
              name !== 'missing_before' &&
              !name.startsWith('custom') &&
              !name.startsWith('wrong_') &&
              !(name === 'missing_after' && context === 'unspecified') &&
              !(name === 'extended' && sample.seed === null),
            expected: Outcome =
              contextUnknown || (['custom', 'custom_array'].includes(name) && sample.n !== null)
                ? { kind: 'Unknown' }
                : error
                  ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                  : { kind: 'True' }
          fixtures.push({
            name: name + '_' + context,
            row: {
              n: known(sample.n),
              label: known(sample.label),
              seed: known(sample.seed),
              expected: known(output),
            },
            expected,
          })
        }
      }
    }
    const error = (state: string) => ({
        kind: 'Error' as const,
        value: { state: parseInt(state, 36) },
      }),
      base: Row = { n: known(2), label: known(null), seed: known(1n), expected: known(null) }
    for (const context of Object.keys(contexts)) {
      fixtures.push({
        name: 'extended_' + context,
        row: { ...base, n: error('22012'), seed: error('22003') },
        expected: error('22012'),
      })
      fixtures.push({
        name: 'extended_' + context,
        row: { ...base, n: { kind: 'Unknown' }, seed: error('22003') },
        expected: error('22003'),
      })
      fixtures.push({
        name: 'extended_' + context,
        row: { ...base, n: { kind: 'Unknown' }, seed: known(null) },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'missing_before_' + context,
        row: { ...base, label: { kind: 'Unknown' } },
        expected: error('42883'),
      })
      fixtures.push({
        name: 'missing_after_' + context,
        row: { ...base, label: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
    }
    await runCheckParity(root, 'compositehashcontext', group, names, fixtures)
    await writeFile(
      'artifacts/goal-checks/composite-hash-active/context-report.json',
      JSON.stringify({ fixtures: fixtures.length, contexts: Object.keys(contexts) }, null, 2) +
        '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)
