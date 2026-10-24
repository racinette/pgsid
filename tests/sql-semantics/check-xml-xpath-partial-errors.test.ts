import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves ordered XPath errors for partial XML fragments and non-NULL path text in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xpath-partial-errors-')),
    packet = 'artifacts/goal-checks/xml-xpath-partial-errors-active'
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  type NativeRow = {
    manifest: string | null
    inner_path: string
    p: string
    bypass: boolean | null
  }
  const rows: NativeRow[] = ['1 div 3', "'text'", '//missing'].flatMap((inner_path) =>
    ['', 'true()', '['].flatMap((p) =>
      [true, false, null].map((bypass) => ({ manifest: '<r/>', inner_path, p, bypass })),
    ),
  )
  rows.push({ manifest: null, inner_path: '[', p: '[', bypass: false })
  rows.push({
    manifest: '<!DOCTYPE r [<!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r/>',
    inner_path: '/',
    p: '',
    bypass: false,
  })
  const fragment = '(xpath(inner_path,manifest))[1]',
    mappings = [
      { name: 'empty', sql: 'ARRAY[]::text[]' },
      { name: 'shape', sql: "ARRAY['bad']" },
      { name: 'prefix', sql: "ARRAY[[NULL,'uri']]::text[]" },
    ]
  const definitions = ['xpath', 'xpath_exists'].flatMap((fn) =>
    mappings.map((mapping) => ({
      name: fn + '_' + mapping.name,
      sql: `CASE WHEN bypass THEN true ELSE ${fn}(p,${fragment},${mapping.sql}) IS NULL END`,
      rows,
    })),
  )
  definitions.push({
    name: 'standard',
    sql: `CASE WHEN bypass THEN true ELSE XMLEXISTS(p PASSING BY REF (${fragment}) BY REF) IS NULL END`,
    rows,
  })
  for (const [name, mapping] of [
    ['path_shape', "ARRAY['bad']"],
    ['path_null', 'NULL::text[]'],
  ] as const)
    definitions.push({
      name,
      sql: `CASE WHEN bypass THEN true ELSE xpath_exists(${fragment}::text,manifest,${mapping}) IS NULL END`,
      rows: rows.filter((r) => r.p === 'true()' || r.manifest === null),
    })
  try {
    for (const d of definitions)
      await pg.exec(
        `CREATE TABLE partial_${d.name}(manifest xml,inner_path text,p text,bypass boolean,CONSTRAINT rule CHECK(${d.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const group = prepareCheckRustGroup(
      definitions.flatMap((d) => {
        const table = catalog.tables.find((t) => t.name === 'partial_' + d.name)!
        return ['source', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: d.name + '_' + origin,
          },
          expression: lowerTableCheck(
            table,
            table.constraints.find((c) => c.name === 'rule')!,
            [],
            [],
            origin as 'source' | 'stored',
            [],
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${d.sql})` : undefined,
          )!.expression,
        }))
      }),
      {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        xmlOption: 'content',
        xpathRecursionLimit: 5000,
      },
    )
    expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: { name: string; input: NativeRow; outcome: Outcome }[] = []
    for (const d of definitions)
      for (const row of d.rows) {
        let rejected: { code: string; constraint?: string } | undefined
        try {
          await pg.query(
            `INSERT INTO partial_${d.name}(manifest,inner_path,p,bypass) VALUES($1,$2,$3,$4)`,
            [row.manifest, row.inner_path, row.p, row.bypass],
          )
        } catch (e) {
          rejected = e as typeof rejected
        }
        let outcome: Outcome
        if (rejected)
          outcome =
            rejected.code === '23514' && rejected.constraint === 'rule'
              ? { kind: 'False' }
              : { kind: 'Error', value: { state: parseInt(rejected.code, 36) } }
        else {
          const result = await pg.query<{ value: boolean | null }>(
            `WITH candidate AS MATERIALIZED(SELECT $1::xml manifest,$2::text inner_path,$3::text p,$4::boolean bypass)SELECT (${d.sql})value FROM candidate`,
            [row.manifest, row.inner_path, row.p, row.bypass],
          )
          expect(result.rows[0]!.value).not.toBe(false)
          outcome = { kind: result.rows[0]!.value === null ? 'Null' : 'True' }
        }
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: d.name + '_' + origin,
            row: {
              manifest: known(row.manifest),
              inner_path: known(row.inner_path),
              p: known(row.p),
              bypass: known(row.bypass),
            },
            expected: outcome,
          })
        reference.push({ name: d.name, input: row, outcome })
      }
    expect(reference).toHaveLength(223)
    expect(fixtures).toHaveLength(446)
    expect(
      reference.some(
        (r) => r.outcome.kind === 'Error' && r.outcome.value.state === parseInt('2200M', 36),
      ),
    ).toBe(true)
    expect(
      reference.some(
        (r) => r.outcome.kind === 'Error' && r.outcome.value.state === parseInt('22000', 36),
      ),
    ).toBe(true)
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
      'xpath_partial_errors',
      group,
      definitions.flatMap((d) => ['source', 'stored'].map((origin) => d.name + '_' + origin)),
      fixtures,
    )
    console.info('XPath partial error parity', {
      nativeInserts: reference.length,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
