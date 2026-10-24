import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches mode-dependent XML well-formedness with invariant missing-mode results, strict states and lazy guards in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-well-formed-mode-')),
    packet = 'artifacts/goal-checks/xml-well-formed-mode-active'
  const known = (v: string | number | boolean | null): Input =>
    v === null ? { kind: 'Null' } : { kind: 'Value', value: v }
  const samples = [
    null,
    '',
    'plain',
    '<r/>',
    '<a/><b/>',
    '<r>',
    '<a></b>',
    '<!--comment-->',
    '<é>雪</é>',
    '<?xml version="1.0"?><r/>',
    '<!DOCTYPE r [<!ENTITY e "text">]><r>&e;</r>',
    '<!DOCTYPE r [<!ENTITY e "&e;">]><r>&e;</r>',
    '<r>&unknown;</r>',
    '<r x="1" x="2"/>',
  ]
  const rows = samples.map((source) => ({ source, bypass: false as boolean | null, divisor: 1 }))
  for (const source of ['plain', null])
    for (const bypass of [true, false, null]) rows.push({ source, bypass, divisor: 0 })
  const definitions = [
    { name: 'plain', sql: 'xml_is_well_formed(source)' },
    { name: 'is_true', sql: 'xml_is_well_formed(source) IS NOT DISTINCT FROM true' },
    { name: 'guard', sql: 'CASE WHEN bypass THEN true ELSE xml_is_well_formed(source) END' },
    { name: 'fallback', sql: 'COALESCE(xml_is_well_formed(source),false)' },
    {
      name: 'ordered',
      sql: 'CASE WHEN bypass THEN true ELSE xml_is_well_formed((1/divisor)::text) END',
    },
    {
      name: 'constant_guard',
      sql: "CASE WHEN bypass THEN true ELSE xml_is_well_formed('plain') END",
    },
  ]
  try {
    for (const d of definitions)
      await pg.exec(
        `CREATE TABLE mode_${d.name}(source text,bypass boolean,divisor integer,CONSTRAINT rule CHECK(${d.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const profiles = [
      { name: 'content', context: { xmlOption: 'content' as const } },
      { name: 'document', context: { xmlOption: 'document' as const } },
      { name: 'missing', context: {} },
    ]
    const checks = definitions.flatMap((d) => {
      const table = catalog.tables.find((t) => t.name === 'mode_' + d.name)!
      return profiles.flatMap((profile) =>
        ['source', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: d.name + '_' + profile.name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === 'rule')!,
              [],
              [],
              origin as 'source' | 'stored',
              [],
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${d.sql})` : undefined,
            )!.expression,
          ),
          executionContext: profile.context,
        })),
      )
    })
    const groups = checks.map((c) =>
      prepareCheckRustGroup([c], {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        ...c.executionContext,
      }),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n')
    const group = {
      checks: groups.flatMap((g) => g.checks),
      evaluatorSource,
      requiresRegex: false,
      source: {
        ...groups[0]!.source!,
        modules: groups[0]!.source!.modules.map((m) =>
          m.name === 'checks'
            ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
            : m,
        ),
      },
    }
    expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: { name: string; row: (typeof rows)[number]; modes: Outcome[] }[] = []
    for (const d of definitions)
      for (const row of rows) {
        const outcomes: Outcome[] = []
        for (const mode of ['content', 'document']) {
          await pg.query("SELECT set_config('xmloption',$1,false)", [mode])
          let rejected: { code: string; constraint?: string } | undefined
          try {
            await pg.query(`INSERT INTO mode_${d.name}(source,bypass,divisor) VALUES($1,$2,$3)`, [
              row.source,
              row.bypass,
              row.divisor,
            ])
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
              `WITH candidate AS MATERIALIZED(SELECT $1::text source,$2::boolean bypass,$3::integer divisor)SELECT (${d.sql})value FROM candidate`,
              [row.source, row.bypass, row.divisor],
            )
            expect(result.rows[0]!.value).not.toBe(false)
            outcome = { kind: result.rows[0]!.value === null ? 'Null' : 'True' }
          }
          outcomes.push(outcome)
        }
        reference.push({ name: d.name, row, modes: outcomes })
        const same = JSON.stringify(outcomes[0]) === JSON.stringify(outcomes[1])
        for (const [index, profile] of profiles.entries())
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: d.name + '_' + profile.name + '_' + origin,
              row: {
                source: known(row.source),
                bypass: known(row.bypass),
                divisor: known(row.divisor),
              },
              expected: index < 2 ? outcomes[index]! : same ? outcomes[0]! : { kind: 'Unknown' },
            })
      }
    expect(reference).toHaveLength(120)
    expect(fixtures).toHaveLength(720)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify(
        { nativeInserts: reference.length * 2, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'xml_well_formed_mode',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.info('XML mode parity', {
      nativeInserts: reference.length * 2,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
