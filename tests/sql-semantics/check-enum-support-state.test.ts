import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const unknown: Input = { kind: 'Unknown' }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('preserves non-strict argument validity, partial bounds, empty/singleton enums, lazy stable calls and OID requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-enum-support-state-'))
  try {
    await pg.exec(
      "CREATE TYPE state_stage AS ENUM ('z','a','b');CREATE TYPE state_empty AS ENUM ();CREATE TYPE state_single AS ENUM ('only');CREATE TABLE enum_state(stage state_stage,peer state_stage,zero state_empty,one state_single,payload text,quantity integer,divisor integer,bypass boolean,expected text);CREATE TABLE enum_state_oracle(LIKE enum_state)",
    )
    const outputs: Record<string, string> = {
      all: 'enum_range(stage)::text',
      bounds: 'enum_range(stage,peer)::text',
      first: 'enum_first(stage)::text',
      last: 'enum_last(stage)::text',
      parsed: 'enum_range((payload::state_stage[])[1])::text',
      calculated: 'enum_range(CASE WHEN quantity/divisor>0 THEN stage ELSE peer END)::text',
      nested: 'cardinality(ARRAY[enum_first(stage)])::text',
      lazy: 'CASE WHEN bypass THEN enum_range(stage)::text ELSE enum_range((payload::state_stage[])[1])::text END',
      empty_all: 'enum_range(zero)::text',
      empty_bounds: 'enum_range(zero,zero)::text',
      empty_first: 'enum_first(zero)::text',
      empty_last: 'enum_last(zero)::text',
      lazy_empty: "CASE WHEN bypass THEN 'skip' ELSE enum_first(zero)::text END",
      singleton: 'enum_range(one,one)::text',
      singleton_first: 'enum_first(one)::text',
      empty_calculated: 'enum_range(CASE WHEN quantity/divisor>0 THEN zero ELSE zero END)::text',
      hash_first: '(hashenum(enum_first(stage)) IS NULL)::text',
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE enum_state ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'enum_state')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'stored'
              ? table.constraints.find((c) => c.name === name)!
              : { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const definition = catalog.enums.find((e) => e.name === 'state_stage')!
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    for (const [stage, peer, payload, divisor, bypass] of [
      ['z', 'b', '{z}', 1, false],
      ['b', 'z', '{b}', 1, true],
      [null, null, null, 1, false],
      ['a', 'a', '{bad}', 1, false],
      ['a', 'b', '{bad}', 0, true],
    ] as const) {
      await pg.exec('TRUNCATE enum_state_oracle')
      await pg.query('INSERT INTO enum_state_oracle VALUES($1,$2,NULL,NULL,$3,1,$4,$5,NULL)', [
        stage,
        peer,
        payload,
        divisor,
        bypass,
      ])
      for (const [name, sql] of Object.entries(outputs)) {
        let value: string | null = null,
          postgres: Outcome
        try {
          value = (
            await pg.query<{ value: string | null }>(`SELECT ${sql} value FROM enum_state_oracle`)
          ).rows[0]!.value
          postgres = { kind: 'True' }
        } catch (cause) {
          const code = (cause as { code: string }).code
          expect(['22P02', '22012', '55000']).toContain(code)
          postgres = error(code)
        }
        const expected: Outcome = name === 'hash_first' ? { kind: 'Unknown' } : postgres
        references.push({
          name,
          stage,
          peer,
          payload,
          divisor,
          bypass,
          value,
          postgres,
          expected,
          ...(name === 'hash_first' ? { requirement: 'deployment enum label OID' } : {}),
        })
        add(
          name,
          {
            stage: stage === null ? known(null) : known(definition.values.indexOf(stage)),
            peer: peer === null ? known(null) : known(definition.values.indexOf(peer)),
            zero: known(null),
            one: known(null),
            payload: known(payload),
            quantity: known(1),
            divisor: known(divisor),
            bypass: known(bypass),
            expected: known(value),
          },
          expected,
        )
      }
    }
    const base = {
      stage: known(0),
      peer: known(2),
      zero: known(null),
      one: known(null),
      payload: known('{z}'),
      quantity: known(1),
      divisor: known(1),
      bypass: known(false),
      expected: known('{z,a,b}'),
    }
    add('all', { ...base, stage: unknown }, { kind: 'True' })
    add('first', { ...base, stage: unknown, expected: known('z') }, { kind: 'True' })
    add('last', { ...base, stage: unknown, expected: known('b') }, { kind: 'True' })
    add('bounds', { ...base, stage: unknown }, { kind: 'Unknown' })
    add('bounds', { ...base, peer: unknown }, { kind: 'Unknown' })
    add('parsed', { ...base, payload: unknown }, { kind: 'Unknown' })
    add('calculated', { ...base, quantity: unknown, divisor: known(0) }, { kind: 'Unknown' })
    add('calculated', { ...base, divisor: known(0) }, error('22012'))
    add('nested', { ...base, stage: unknown, expected: known('1') }, { kind: 'True' })
    add(
      'lazy',
      { ...base, bypass: known(true), payload: error('22003'), stage: unknown },
      { kind: 'True' },
    )
    add('empty_all', { ...base, zero: unknown, expected: known('{}') }, { kind: 'True' })
    add('empty_bounds', { ...base, zero: unknown, expected: known('{}') }, { kind: 'True' })
    add('empty_first', { ...base, zero: unknown }, error('55000'))
    add('empty_last', { ...base, zero: unknown }, error('55000'))
    add(
      'lazy_empty',
      { ...base, bypass: known(true), zero: error('22012'), expected: known('skip') },
      { kind: 'True' },
    )
    add('singleton', { ...base, one: unknown, expected: known('{only}') }, { kind: 'True' })
    add('singleton_first', { ...base, one: unknown, expected: known('only') }, { kind: 'True' })
    add('empty_calculated', { ...base, quantity: unknown, divisor: known(0) }, { kind: 'Unknown' })
    add('all', { ...base, stage: error('22012') }, error('22012'))
    add('all', { ...base, stage: known(99) }, { kind: 'Unknown' })
    add('bounds', { ...base, stage: error('22012'), peer: error('22003') }, error('22012'))
    add('bounds', { ...base, stage: unknown, peer: error('22003') }, error('22003'))
    add('empty_all', { ...base, zero: error('22012') }, error('22012'))
    add('empty_first', { ...base, zero: error('22012') }, error('22012'))
    await mkdir('artifacts/enum-support', { recursive: true })
    await writeFile(
      'artifacts/enum-support/state-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/enum-support/state-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'enumsupportstate',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('retains PostgreSQL rejection of enum domains, unresolved NULL types and mismatched nominal bounds', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      "CREATE TYPE nominal_stage AS ENUM ('new','done');CREATE TYPE foreign_stage AS ENUM ('new','done');CREATE DOMAIN nominal_domain AS nominal_stage;CREATE TABLE enum_admission(stage nominal_stage,domain_stage nominal_domain,foreign_stage foreign_stage)",
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'enum_admission')!
    const cases: [string, string][] = [
      ['enum_range(domain_stage)', '42883'],
      ['enum_first(domain_stage)', '42883'],
      ['enum_last(domain_stage)', '42883'],
      ['enum_range(NULL)', '42883'],
      ['enum_range(NULL,NULL)', '42883'],
      ['enum_range(stage,foreign_stage)', '42883'],
    ]
    const report = []
    for (const [expression, code] of cases) {
      const sql = `(${expression}) IS NULL`
      await expect(pg.query('SELECT ' + sql + ' FROM enum_admission')).rejects.toMatchObject({
        code,
      })
      const lowered = lowerTableCheck(
        table,
        { name: 'admission', type: 'check', definition: `CHECK(${sql})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!
      const source = portableCheckAtoms(lowered.expression)
      expect(source.kind).toBe('uncertain')
      report.push({ sql, postgresError: code, source })
    }
    await mkdir('artifacts/enum-support', { recursive: true })
    await writeFile('artifacts/enum-support/admission.json', JSON.stringify(report, null, 2) + '\n')
  } finally {
    await pg.close()
  }
})
