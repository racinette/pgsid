import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  catalogRangeType,
  catalogMultirangeType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves declared monetary context through range and multirange input, output and recursive containers in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-money-range-context-')),
    packet = 'artifacts/goal-checks/money-range-context-active'
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      "SET lc_monetary='C';SET array_nulls=on;CREATE DOMAIN money_bound AS money;CREATE TYPE money_span AS RANGE(subtype=money_bound,multirange_type_name=money_spans);CREATE TYPE money_array_span AS RANGE(subtype=money[],multirange_type_name=money_array_spans);CREATE TYPE money_nested_span AS RANGE(subtype=money_span,multirange_type_name=money_nested_spans);CREATE TYPE money_record AS (span money_span,spans money_spans)",
    )
    const spanSamples = [
      null,
      'empty',
      '(,)',
      '[0,1.25)',
      '[-1234.56,2000.01]',
      '[92233720368547758.07,)',
      '(,-92233720368547758.08]',
    ]
    const multiSamples = [
      null,
      '{}',
      '{(,)}',
      '{[0,1.25),[2000.01,3000.02]}',
      '{[-92233720368547758.08,-1.25],[1.25,92233720368547758.07]}',
    ]
    const arraySamples = [null, 'empty', '(,)', '["{1.25}","{2000.01}"]']
    const arrayMultiSamples = [null, '{}', '{(,)}', '{["{1.25}","{2000.01}"]}']
    const nestedSamples = [null, 'empty', '(,)', '["[0,1.25)","[2000.01,3000.02]"]']
    const definitions = [
      ...[
        'money_span',
        'money_spans',
        'money_array_span',
        'money_array_spans',
        'money_nested_span',
      ].flatMap((type) => [
        { name: type + '_out', type, expression: 'payload::text', input: false },
        { name: type + '_input', type, expression: `(source::${type})::text`, input: true },
        { name: type + '_array', type, expression: 'ARRAY[payload,NULL]::text', input: false },
        {
          name: type + '_record',
          type,
          expression: 'ROW(payload,ARRAY[payload])::text',
          input: false,
        },
        { name: type + '_json', type, expression: 'to_jsonb(payload)::text', input: false },
        {
          name: type + '_array_json',
          type,
          expression: 'to_jsonb(ARRAY[payload,NULL])::text',
          input: false,
        },
      ]),
      {
        name: 'named_record',
        type: 'money_span',
        expression: 'ROW(payload,money_spans(payload))::money_record::text',
        input: false,
      },
    ]
    for (const d of definitions)
      await pg.exec(
        `CREATE TABLE range_${d.name}(payload ${d.type},source text,expected text,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE (${d.expression}) IS NOT DISTINCT FROM expected END))`,
      )
    const catalog = await snapshotCatalog(pg),
      profiles = [
        { name: 'C', context: { moneyLocale: 'C' as const } },
        { name: 'missing', context: {} },
      ]
    const groups = profiles.map((profile) =>
      prepareCheckRustGroup(
        definitions.flatMap((d) => {
          const table = catalog.tables.find((t) => t.name === 'range_' + d.name)!
          return ['source', 'stored'].map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: profile.name + '_' + d.name + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((c) => c.name === 'rule')!,
                catalog.enums,
                catalog.domains,
                origin as 'source' | 'stored',
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source'
                  ? `CHECK(CASE WHEN bypass THEN true ELSE (${d.expression}) IS NOT DISTINCT FROM expected END)`
                  : undefined,
              )!.expression,
            ),
          }))
        }),
        { defaultCollation: 'C', serverEncoding: 'UTF8', arrayNulls: true, ...profile.context },
      ),
    )
    for (const group of groups)
      expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n'),
      group = {
        ...groups[0]!,
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: {
          ...groups[0]!.source!,
          modules: groups[0]!.source!.modules.map((m) =>
            m.name === 'checks'
              ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
              : m,
          ),
        },
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const d of definitions) {
      const table = catalog.tables.find((t) => t.name === 'range_' + d.name)!,
        column = table.columns.find((c) => c.name === 'payload')!
      const multi = d.type === 'money_spans' || d.type === 'money_array_spans'
      const rangeLogical = catalogRangeType(
        column.typeName,
        column.typeOid,
        catalog.domains,
        catalog.rangeTypes,
      )
      const multiLogical = catalogMultirangeType(
        column.typeName,
        column.typeOid,
        catalog.domains,
        catalog.rangeTypes,
      )
      const samples =
        d.type === 'money_spans'
          ? multiSamples
          : d.type === 'money_array_spans'
            ? arrayMultiSamples
            : d.type === 'money_array_span'
              ? arraySamples
              : d.type === 'money_nested_span'
                ? nestedSamples
                : spanSamples
      for (const sample of samples) {
        const source = d.input ? sample : null
        const payload = d.input ? null : sample
        let result: string | null = null,
          error: string | undefined
        try {
          result = (
            await pg.query<{ value: string | null }>(
              `WITH candidate AS MATERIALIZED(SELECT $1::${d.type} payload,$2::text source)SELECT (${d.expression})value FROM candidate`,
              [payload, source],
            )
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        const value =
          payload === null
            ? null
            : multi
              ? await readMultirangeFixture(pg, multiLogical!, payload)
              : await readRangeFixture(pg, `SELECT $1::${d.type} value`, 'value', rangeLogical!, [
                  payload,
                ])
        const input: Row = {
          payload: known(value),
          source: known(source),
          expected: known(result),
          bypass: known(false),
        }
        for (const bypass of [false, true]) {
          let outcome: Outcome = { kind: 'True' }
          try {
            await pg.query(
              `INSERT INTO range_${d.name}(payload,source,expected,bypass)VALUES($1::${d.type},$2,$3,$4)`,
              [payload, source, result, bypass],
            )
          } catch (e) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((e as { code: string }).code, 36) },
            }
          }
          if (!bypass && error)
            expect(outcome).toEqual({ kind: 'Error', value: { state: parseInt(error, 36) } })
          for (const profile of profiles)
            for (const origin of ['source', 'stored']) {
              const independent =
                bypass ||
                sample === null ||
                sample === 'empty' ||
                sample === '{}' ||
                sample === '(,)' ||
                sample === '{(,)}'
              fixtures.push({
                name: profile.name + '_' + d.name + '_' + origin,
                row: { ...input, bypass: known(bypass) },
                expected: profile.name === 'C' || independent ? outcome : { kind: 'Unknown' },
              })
            }
          reference.push({ name: d.name, sample, bypass, result, outcome })
        }
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify(
        { nativeInserts: reference.length, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'money_range_context',
      group,
      profiles.flatMap((p) =>
        definitions.flatMap((d) =>
          ['source', 'stored'].map((o) => p.name + '_' + d.name + '_' + o),
        ),
      ),
      fixtures,
    )
    console.info('Money range parity', {
      nativeInserts: reference.length,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
