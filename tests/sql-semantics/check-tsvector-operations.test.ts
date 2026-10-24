import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/tsvector-operations-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it('matches document concatenation, selective weights, deletion, filtering, array construction and binary send through source and stored CHECK INSERTs in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-operations-'))
  try {
    const vector = 'source::tsvector',
      other = 'other::tsvector',
      terms = 'terms::text[]',
      weights = 'weights::"char"[]'
    const operations: Record<string, string> = {
      concat: `(${vector}||${other})::text`,
      reverse_concat: `(${other}||${vector})::text`,
      selective: `setweight(${vector},weight,${terms})::text`,
      delete_scalar: `ts_delete(${vector},lexeme)::text`,
      delete_array: `ts_delete(${vector},${terms})::text`,
      filter: `ts_filter(${vector},${weights})::text`,
      construct: `array_to_tsvector(${terms})::text`,
      send: `encode(tsvectorsend(${vector}),'hex')`,
      send_concat: `encode(tsvectorsend(${vector}||${other}),'hex')`,
      concat_compare: `((${vector}||${other})=${vector})::text`,
      deleted_compare: `(ts_delete(${vector},${terms})=${vector})::text`,
      filtered_compare: `(ts_filter(${vector},${weights})=${vector})::text`,
      array_cells: `to_jsonb(ARRAY[${vector}||${other},setweight(${vector},weight,${terms})])::text`,
      record_field: `((ROW(ts_filter(${vector},${weights}),ts_delete(${vector},${terms}))::document_pair).head)::text`,
    }
    await pg.exec('CREATE TYPE document_pair AS(head tsvector,tail tsvector)')
    const columns =
      'source text,other text,terms text,weights text,weight "char",lexeme text,expected text,bypass bool'
    for (const [name, sql] of Object.entries(operations))
      await pg.exec(
        `CREATE TABLE operation_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE (${sql}) IS NOT DISTINCT FROM expected END))`,
      )
    await pg.exec(`CREATE TEMP TABLE operation_input(${columns})`)
    const catalog = await snapshotCatalog(pg)
    const checks = Object.entries(operations).flatMap(([name, sql]) => {
      const table = catalog.tables.find((t) => t.name === 'operation_' + name)!,
        c = table.constraints[0]!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...c,
                  definition: `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) IS NOT DISTINCT FROM expected END)`,
                }
              : c,
            [],
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(checks, {
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      defaultCollation: 'C',
      arrayNulls: true,
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const baseline = {
      source: 'a:1A,2B b:3C c',
      other: 'a:1D z:2',
      terms: '{a,z,NULL}',
      weights: '{A,C}',
      weight: 'B',
      lexeme: 'a',
    }
    const cases: Partial<Record<keyof typeof baseline, string | null>>[] = [
      {},
      { source: null },
      { source: '' },
      { other: null },
      { other: '' },
      { source: 'a:16383A', other: 'a:1B z:2C' },
      {
        source: 'a:' + Array.from({ length: 256 }, (_, i) => i + 1 + (i % 2 ? 'A' : 'B')).join(','),
        other: 'a:1C,2D',
      },
      {
        source: "'it''s':1A é:2B 😀:3C",
        other: '😀:1D',
        terms: '{"it\'s","😀"}',
        weights: '{B,C}',
      },
      { terms: '{}', weights: '{}' },
      { terms: '[0:1][2:3]={{a,b},{a,NULL}}', weights: '[3:3]={A}' },
      { terms: null },
      { weights: null },
      { weight: null },
      { lexeme: null },
      { weight: '?' },
      { terms: '{NULL}' },
      { terms: '{""}' },
      { terms: '{"' + 'x'.repeat(2047) + '"}' },
      { weights: '{NULL}' },
      { weights: '{?}' },
      { weights: '{NULL,?}' },
      { weights: '{?,NULL}' },
      { weights: '{"\\\\377"}' },
      { terms: '{' },
      { source: 'a:0' },
      { source: "'" },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      rejections = 0
    for (const [caseIndex, override] of cases.entries()) {
      const sample = { ...baseline, ...override }
      for (const variant of [0, 1, 2])
        for (const [name, operation] of Object.entries(operations)) {
          const bypass = variant === 2
          await pg.query('DELETE FROM operation_input')
          const values = [
            sample.source,
            sample.other,
            sample.terms,
            sample.weights,
            sample.weight,
            sample.lexeme,
            null,
            bypass,
          ]
          await pg.query('INSERT INTO operation_input VALUES($1,$2,$3,$4,$5,$6,$7,$8)', values)
          let text: string | null = null,
            state: string | undefined
          try {
            text = (
              await pg.query<{ v: string | null }>(`SELECT (${operation}) v FROM operation_input`)
            ).rows[0]!.v
          } catch (e) {
            state = (e as { code: string }).code
          }
          const expected = variant === 1 ? 'unmatched document result' : text
          await pg.query('UPDATE operation_input SET expected=$1', [expected])
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO operation_${name} SELECT * FROM operation_input`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          const outcome: Outcome = bypass
            ? { kind: 'True' }
            : state
              ? error(state)
              : { kind: variant === 1 ? 'False' : 'True' }
          expect(failure, `${name} ${caseIndex} ${variant}`).toBe(
            outcome.kind === 'Error' ? state : outcome.kind === 'False' ? '23514' : undefined,
          )
          inserts++
          if (failure) rejections++
          const row: Row = {
            source: known(sample.source),
            other: known(sample.other),
            terms: known(sample.terms),
            weights: known(sample.weights),
            weight: sample.weight === null ? known(null) : known(sample.weight.charCodeAt(0)),
            lexeme: known(sample.lexeme),
            expected: known(expected),
            bypass: known(bypass),
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected: outcome })
          references.push({ name, caseIndex, variant, text, state, failure })
        }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'operations-reference.json'),
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejections,
          fixtures: fixtures.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsvectoroperations',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `document operations: ${inserts} native INSERTs, ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('keeps document lexeme search independent of collation and reaches only the required UTF8 server or client context', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-context-'))
  try {
    await pg.exec(`CREATE COLLATION document_insensitive(provider=icu,locale='und',deterministic=false);
   CREATE TABLE document_context(source text,lexeme text,terms text,expected_deleted text,expected_built text,expected_wire text,bypass bool,
    CONSTRAINT deleted CHECK(CASE WHEN bypass THEN true ELSE ts_delete(source::tsvector,lexeme COLLATE document_insensitive)::text IS NOT DISTINCT FROM expected_deleted END),
    CONSTRAINT built CHECK(CASE WHEN bypass THEN true ELSE array_to_tsvector(terms::text[])::text IS NOT DISTINCT FROM expected_built END),
    CONSTRAINT wire CHECK(CASE WHEN bypass THEN true ELSE encode(tsvectorsend(source::tsvector),'hex') IS NOT DISTINCT FROM expected_wire END))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'document_context')!
    const samples = [
      { source: 'a:1A', lexeme: 'a', terms: '{b,a,a}' },
      { source: 'é:1A 😀:2B', lexeme: 'é', terms: '{é,😀}' },
      { source: 'CAFÉ:1 café:2', lexeme: 'café', terms: '{CAFÉ,café}' },
      { source: '', lexeme: '', terms: '{}' },
      { source: null, lexeme: null, terms: null },
    ]
    const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    type Group = ReturnType<typeof prepareCheckRustGroup>
    const groups: (Group & { source: NonNullable<Group['source']> })[] = []
    for (const server of [false, true])
      for (const client of [false, true]) {
        const selected = table.constraints.flatMap((c) =>
          (['source', 'stored'] as const).map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: c.name + '_' + server + '_' + client + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(table, c, [], catalog.domains, origin)!.expression,
            ),
          })),
        )
        const group = prepareCheckRustGroup(selected, {
          ...(server ? { serverEncoding: 'UTF8' as const } : {}),
          ...(client ? { clientEncoding: 'UTF8' as const } : {}),
          defaultCollation: 'C',
          arrayNulls: true,
        })
        checks.push(...selected)
        if (!group.source) throw new Error('Missing context evaluator source')
        groups.push({ ...group, source: group.source })
        for (const sample of samples) {
          const result = (
            await pg.query<{ deleted: string | null; built: string | null; wire: string | null }>(
              `SELECT ts_delete($1::tsvector,$2::text COLLATE document_insensitive)::text deleted,array_to_tsvector($3::text[])::text built,encode(tsvectorsend($1::tsvector),'hex') wire`,
              [sample.source, sample.lexeme, sample.terms],
            )
          ).rows[0]!
          for (const bypass of [false, true]) {
            const values = [
              sample.source,
              sample.lexeme,
              sample.terms,
              result.deleted,
              result.built,
              result.wire,
              bypass,
            ]
            await pg.query('INSERT INTO document_context VALUES($1,$2,$3,$4,$5,$6,$7)', values)
            const row: Row = {
              source: known(sample.source),
              lexeme: known(sample.lexeme),
              terms: known(sample.terms),
              expected_deleted: known(result.deleted),
              expected_built: known(result.built),
              expected_wire: known(result.wire),
              bypass: known(bypass),
            }
            for (const check of selected) {
              const name = check.identity.constraint,
                unicodeSource = /[^\x00-\x7f]/u.test(sample.source ?? ''),
                unicodeTerms = /[^\x00-\x7f]/u.test(sample.terms ?? '')
              const unknown =
                !bypass &&
                (name.startsWith('built_')
                  ? unicodeTerms && !server
                  : unicodeSource && (!server || (name.startsWith('wire_') && !client)))
              fixtures.push({ name, row, expected: { kind: unknown ? 'Unknown' : 'True' } })
            }
          }
        }
      }
    const group = {
      ...groups[0]!,
      checks: groups.flatMap((g) => g.checks),
      source: {
        ...groups[0]!.source,
        modules: groups[0]!.source.modules.map((m, i) =>
          i === groups[0]!.source.modules.length - 1
            ? {
                ...m,
                files: [
                  {
                    ...m.files[0]!,
                    source: groups
                      .flatMap((g) => g.source.modules.at(-1)!.files.map((f) => f.source))
                      .join('\n'),
                  },
                ],
              }
            : m,
        ),
      },
    }
    group.checks.forEach((c) => expect(c.kind).toBe('supported'))
    await runCheckParity(
      root,
      'tsvectorcontext',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'context-reference.json'),
      JSON.stringify(
        { nativeInserts: samples.length * 8, fixtures: fixtures.length, contexts: groups.length },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
