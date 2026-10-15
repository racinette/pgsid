import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches recursive JSONB null stripping, default arguments, optional array removal and exact pretty layout in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-format-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec(
      'CREATE DOMAIN format_document AS jsonb;CREATE DOMAIN retained_format_document AS format_document',
    )
    const expressions: Record<string, string> = {
      strip_default: 'jsonb_strip_nulls(document) IS NOT DISTINCT FROM expected_default',
      strip_false: 'jsonb_strip_nulls(document,false) IS NOT DISTINCT FROM expected_default',
      strip_true: 'jsonb_strip_nulls(document,true) IS NOT DISTINCT FROM expected_arrays',
      strip_flag: 'jsonb_strip_nulls(document,strip_arrays) IS NOT DISTINCT FROM expected',
      strip_qualified:
        'pg_catalog.jsonb_strip_nulls(document,strip_arrays) IS NOT DISTINCT FROM expected',
      pretty: 'jsonb_pretty(document) COLLATE "C" IS NOT DISTINCT FROM expected_pretty COLLATE "C"',
      pretty_default:
        'jsonb_pretty(jsonb_strip_nulls(document)) COLLATE "C" IS NOT DISTINCT FROM expected_default_pretty COLLATE "C"',
      pretty_flag:
        'jsonb_pretty(jsonb_strip_nulls(document,strip_arrays)) COLLATE "C" IS NOT DISTINCT FROM expected_pretty_flag COLLATE "C"',
      guarded_strip:
        'CASE WHEN bypass THEN true ELSE jsonb_strip_nulls(document,strip_arrays) IS NOT DISTINCT FROM expected END',
      guarded_pretty:
        'CASE WHEN bypass THEN true ELSE jsonb_pretty(document) COLLATE "C" IS NOT DISTINCT FROM expected_pretty COLLATE "C" END',
      selected:
        'jsonb_strip_nulls(CASE WHEN bypass THEN fallback ELSE document END,strip_arrays) IS NOT DISTINCT FROM expected',
      coalesced:
        'COALESCE(jsonb_strip_nulls(document,strip_arrays),fallback) IS NOT DISTINCT FROM expected_coalesced',
      extracted:
        "jsonb_strip_nulls(document->'selected',strip_arrays) IS NOT DISTINCT FROM expected_extracted",
      pretty_extracted:
        'jsonb_pretty(document->\'selected\') COLLATE "C" IS NOT DISTINCT FROM expected_extracted_pretty COLLATE "C"',
      edited:
        'jsonb_strip_nulls(document||fallback,strip_arrays) IS NOT DISTINCT FROM expected_edited',
      numeric_scale:
        'jsonb_pretty(jsonb_strip_nulls(document)->\'n\') COLLATE "C" IS NOT DISTINCT FROM expected_numeric COLLATE "C"',
      root_null:
        '(jsonb_strip_nulls(document,strip_arrays) IS NULL) IS NOT DISTINCT FROM expected_null',
      literal: `jsonb_strip_nulls('{"a":null,"b":[null,1]}'::retained_format_document,true)='{"b":[1]}'::jsonb`,
    }
    await pg.exec(
      `CREATE TABLE jsonb_formats(document retained_format_document,fallback jsonb,strip_arrays boolean,expected jsonb,expected_default jsonb,expected_arrays jsonb,expected_pretty text,expected_default_pretty text,expected_pretty_flag text,expected_coalesced jsonb,expected_extracted jsonb,expected_extracted_pretty text,expected_edited jsonb,expected_numeric text,expected_null boolean,bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_formats')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...c, name: name + '_stored' },
      ]
    })
    const plans = constraints.map((c) => ({
      expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: c.name },
    }))
    for (const [index, plan] of plans.entries())
      expect(hasUncertain(plan.expression), constraints[index]!.name).toBe(false)
    const group = prepareCheckRustGroup(plans)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[index]!.name + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const sources: (string | null)[] = [
      null,
      'null',
      'false',
      'true',
      '0',
      '-0.000',
      '9007199254740993.00',
      '""',
      '"雪😊"',
      '"\\b\\f\\n\\r\\t\\u0001\\\"\\\\"',
      '[]',
      '{}',
      '[null]',
      '[null,null]',
      '[null,1,null,2,null]',
      '{"a":null}',
      '{"a":1,"b":null}',
      '{"a":null,"b":null}',
      '{"a":1,"a":null}',
      '{"a":null,"a":1}',
      '{"a":[null,{"b":null,"c":2}],"d":{"e":null},"n":1.2300}',
      '[[],{},[null],{"a":null}]',
      '{"":null,"a":1}',
      '{"雪":null}',
      '{"雪":"😊"}',
      '{"":1,"雪":2}',
      '{"aa":null,"é":2}',
      '{"aa":1,"é":null}',
      '{"aa":1,"é":2}',
      '[{"aa":null,"é":2}]',
      '{"selected":[null,{"a":null,"b":2}],"other":{"aa":1,"é":2}}',
      '{"selected":1,"other":{"aa":1,"é":2}}',
    ]
    for (let i = 0; i < 48; i++)
      sources.push(
        `{"a${i % 7}":${i % 3 === 0 ? 'null' : i},"array":[null,${i},{"n":1.2300,"gone":null}],"gone":null,"object":{"a":null,"b":${i % 2 === 0 ? 'null' : 'true'}}}`,
      )
    sources.push('['.repeat(128) + 'null' + ']'.repeat(128))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    const contextNeeded = (source: string | null): boolean => {
      if (source === null) return false
      const value: unknown = JSON.parse(source),
        pending: unknown[] = [value]
      while (pending.length) {
        const item = pending.pop()
        if (Array.isArray(item)) {
          pending.push(...item)
        } else if (item !== null && typeof item === 'object') {
          const keys = Object.keys(item)
          if (
            keys.filter((k) => k.length > 0).length > 1 &&
            keys.some((k) => /[^\x00-\x7f]/u.test(k))
          )
            return true
          pending.push(...Object.values(item))
        }
      }
      return false
    }
    let base: Row | undefined
    for (const source of sources)
      for (const arrays of [false, true, null]) {
        const r = (
          await pg.query<{
            input: string | null
            stripped: string | null
            stripped_default: string | null
            stripped_arrays: string | null
            pretty: string | null
            pretty_default: string | null
            pretty_flag: string | null
            coalesced: string | null
            extracted: string | null
            extracted_pretty: string | null
            extracted_source: string | null
            edited: string | null
            numeric: string | null
            is_null: boolean
          }>(
            `SELECT document::text input,jsonb_strip_nulls(document,$2::bool)::text stripped,jsonb_strip_nulls(document)::text stripped_default,jsonb_strip_nulls(document,true)::text stripped_arrays,jsonb_pretty(document) pretty,jsonb_pretty(jsonb_strip_nulls(document)) pretty_default,jsonb_pretty(jsonb_strip_nulls(document,$2::bool)) pretty_flag,COALESCE(jsonb_strip_nulls(document,$2::bool),'{}'::jsonb)::text coalesced,jsonb_strip_nulls(document->'selected',$2::bool)::text extracted,jsonb_pretty(document->'selected') extracted_pretty,(document->'selected')::text extracted_source,jsonb_strip_nulls(document||'{}'::jsonb,$2::bool)::text edited,jsonb_pretty(jsonb_strip_nulls(document)->'n') numeric,jsonb_strip_nulls(document,$2::bool) IS NULL is_null FROM(SELECT $1::jsonb document)q`,
            [source, arrays],
          )
        ).rows[0]!
        const row: Row = {
          document: known(r.input),
          fallback: known('{}'),
          strip_arrays: known(arrays),
          expected: known(r.stripped),
          expected_default: known(r.stripped_default),
          expected_arrays: known(r.stripped_arrays),
          expected_pretty: known(r.pretty),
          expected_default_pretty: known(r.pretty_default),
          expected_pretty_flag: known(r.pretty_flag),
          expected_coalesced: known(r.coalesced),
          expected_extracted: known(r.extracted),
          expected_extracted_pretty: known(r.extracted_pretty),
          expected_edited: known(r.edited),
          expected_numeric: known(r.numeric),
          expected_null: known(r.is_null),
          bypass: known(false),
        }
        for (const name of [
          'strip_default',
          'strip_false',
          'strip_true',
          'strip_flag',
          'strip_qualified',
          'guarded_strip',
          'selected',
          'coalesced',
          'extracted',
          'edited',
          'numeric_scale',
          'root_null',
          'literal',
        ])
          add(name, row, { kind: 'True' })
        for (const [name, value] of [
          ['pretty', r.input],
          ['guarded_pretty', r.input],
          ['pretty_default', r.stripped_default],
          ['pretty_flag', r.stripped],
          ['pretty_extracted', r.extracted_source],
        ] as const)
          add(name, row, { kind: contextNeeded(value) ? 'Unknown' : 'True' })
        oracle.push({
          source,
          arrays,
          ...r,
          prettyContext: contextNeeded(r.input),
          strippedPrettyContext: contextNeeded(r.stripped),
        })
        if (source === '{"a":1,"b":null}' && arrays === true) base = row
      }
    const baseline = base!
    for (const operand of [{ kind: 'Unknown' } as const, error('22003')]) {
      const expected: Outcome = operand.kind === 'Error' ? operand : { kind: 'Unknown' }
      for (const name of [
        'strip_default',
        'strip_flag',
        'strip_qualified',
        'pretty',
        'pretty_default',
        'pretty_flag',
        'guarded_strip',
        'guarded_pretty',
        'selected',
        'coalesced',
        'extracted',
        'edited',
        'root_null',
      ])
        add(name, { ...baseline, document: operand }, expected)
      for (const name of [
        'strip_flag',
        'strip_qualified',
        'pretty_flag',
        'guarded_strip',
        'selected',
        'coalesced',
        'extracted',
        'edited',
        'root_null',
      ])
        add(name, { ...baseline, strip_arrays: operand }, expected)
      for (const name of ['guarded_strip', 'guarded_pretty'])
        add(name, { ...baseline, document: operand, bypass: known(true) }, { kind: 'True' })
      add(
        'selected',
        { ...baseline, document: operand, bypass: known(true), expected: known('{}') },
        { kind: 'True' },
      )
    }
    add(
      'strip_flag',
      { ...baseline, document: error('22003'), strip_arrays: error('22012') },
      error('22003'),
    )
    add(
      'strip_flag',
      { ...baseline, document: known(null), strip_arrays: error('22012') },
      error('22012'),
    )
    add(
      'strip_flag',
      { ...baseline, document: { kind: 'Unknown' }, strip_arrays: known(null) },
      { kind: 'Unknown' },
    )
    add('strip_default', { ...baseline, expected_default: known('{}') }, { kind: 'False' })
    add('pretty', { ...baseline, expected_pretty: known('{}') }, { kind: 'False' })
    for (const name of ['strip_default', 'pretty'])
      add(name, { ...baseline, document: known('[1,]') }, { kind: 'Unknown' })
    for (const depth of [128, 16384]) {
      const input = '['.repeat(depth) + '{"drop":null,"keep":1}' + ']'.repeat(depth),
        expected = '['.repeat(depth) + '{"keep":1}' + ']'.repeat(depth)
      add(
        'strip_default',
        { ...baseline, document: known(input), expected_default: known(expected) },
        { kind: 'True' },
      )
      add(
        'strip_true',
        { ...baseline, document: known(input), expected_arrays: known(expected) },
        { kind: 'True' },
      )
    }
    await mkdir('artifacts/jsonb-format', { recursive: true })
    await writeFile(
      'artifacts/jsonb-format/oracle.json',
      JSON.stringify(
        { cases: oracle, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_formats',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
