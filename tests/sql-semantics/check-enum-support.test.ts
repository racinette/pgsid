import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('uses captured enum label order for ranges and endpoints across databases without embedding OIDs', async () => {
  const pg = await PGlite.create(),
    other = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-enum-support-values-'))
  try {
    const outputs: Record<string, string> = {
      all: 'enum_range(stage)::text',
      bounds: 'enum_range(stage,peer)::text',
      first: 'enum_first(stage)::text',
      last: 'enum_last(stage)::text',
      count: 'cardinality(enum_range(stage,peer))::text',
      layout: 'array_dims(enum_range(stage,peer))',
      cell: '(enum_range(stage,peer))[1]::text',
      search: 'array_position(enum_range(stage,peer),stage)::text',
      bucket: 'width_bucket(stage,enum_range(peer))::text',
      span: 'enum_range(enum_first(stage),enum_last(peer))::text',
      coalesced: "COALESCE(enum_range(stage,peer),ARRAY['z'::support_stage])::text",
      lazy: "CASE WHEN bypass THEN 'pruned' ELSE enum_range(stage,peer)::text END",
      parsed: 'enum_range((payload::support_stage[])[1])::text',
      lazy_parsed:
        "CASE WHEN bypass THEN 'pruned' ELSE enum_range((payload::support_stage[])[1])::text END",
      calculated: 'enum_range(CASE WHEN quantity/divisor>0 THEN stage ELSE peer END)::text',
      empty_lazy: "CASE WHEN bypass THEN 'pruned' ELSE enum_first(NULL::support_empty)::text END",
      invalid_literal:
        "CASE WHEN bypass THEN 'pruned' ELSE enum_range(('{bad}'::support_stage[])[1])::text END",
      nested: 'ARRAY[enum_range(stage,peer)]::text',
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    async function setup(database: PGlite, extra: boolean) {
      if (extra) await database.exec("CREATE TYPE oid_padding AS ENUM ('one','two','three')")
      await database.exec(
        `CREATE TYPE support_stage AS ENUM ('z','a','雪','quote"s','NULL','');ALTER TYPE support_stage ADD VALUE 'beta' BEFORE 'a';CREATE TYPE support_empty AS ENUM ();CREATE TABLE support_values(stage support_stage,peer support_stage,payload text,quantity integer,divisor integer,bypass boolean,expected text);CREATE TABLE support_oracle(LIKE support_values)`,
      )
      for (const [name, sql] of Object.entries(forms)) {
        if (name === 'invalid_literal') continue
        await database.exec(
          `ALTER TABLE support_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
        )
      }
      return snapshotCatalog(database)
    }
    const catalog = await setup(pg, false),
      foreign = await setup(other, true),
      definition = catalog.enums.find((e) => e.name === 'support_stage')!,
      foreignDefinition = foreign.enums.find((e) => e.name === 'support_stage')!
    expect(definition.values).toEqual(foreignDefinition.values)
    expect(definition.valueOids).not.toEqual(foreignDefinition.valueOids)
    expect(
      definition.valueOids!.some(
        (oid, index) => index > 0 && oid < definition.valueOids![index - 1]!,
      ),
    ).toBe(true)
    const prepare = (snapshot: typeof catalog) => {
      const table = snapshot.tables.find((t) => t.name === 'support_values')!
      return Object.entries(forms).flatMap(([name, sql]) =>
        (name === 'invalid_literal' ? (['source'] as const) : (['source', 'stored'] as const)).map(
          (origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                origin === 'stored' && name !== 'invalid_literal'
                  ? table.constraints.find((c) => c.name === name)!
                  : { name, type: 'check', definition: `CHECK(${sql})` },
                snapshot.enums,
                snapshot.domains,
                origin === 'stored' && name === 'invalid_literal' ? 'source' : origin,
              )!.expression,
            ),
          }),
        ),
      )
    }
    const plans = prepare(catalog),
      foreignPlans = prepare(foreign)
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    const context = {
        arrayNulls: true,
        defaultCollation: 'C' as const,
        serverEncoding: 'UTF8' as const,
      },
      group = prepareCheckRustGroup(plans, context),
      foreignGroup = prepareCheckRustGroup(foreignPlans, context)
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    expect(group.evaluatorSource).toBe(foreignGroup.evaluatorSource)
    expect(group.evaluatorSource).not.toContain('make_catalog_enum_value')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const labels = [null, ...definition.values]
    for (const stage of labels)
      for (const peer of labels)
        for (const bypass of [false, true]) {
          const payload =
            stage === null
              ? null
              : (
                  await pg.query<{ value: string }>('SELECT ARRAY[$1::support_stage]::text value', [
                    stage,
                  ])
                ).rows[0]!.value
          await pg.exec('TRUNCATE support_oracle')
          await pg.query('INSERT INTO support_oracle VALUES($1,$2,$3,1,1,$4,NULL)', [
            stage,
            peer,
            payload,
            bypass,
          ])
          for (const [name, sql] of Object.entries(outputs)) {
            let value: string | null = null,
              expected: Outcome
            try {
              value = (
                await pg.query<{ value: string | null }>(`SELECT ${sql} value FROM support_oracle`)
              ).rows[0]!.value
              expected = { kind: 'True' }
            } catch (cause) {
              const code = (cause as { code: string }).code
              expect(['22P02', '2202E', '55000']).toContain(code)
              expected = error(code)
            }
            references.push({ name, stage, peer, payload, bypass, value, expected })
            for (const origin of name === 'invalid_literal' ? ['source'] : ['source', 'stored']) {
              const row = {
                stage: stage === null ? known(null) : known(definition.values.indexOf(stage)),
                peer: peer === null ? known(null) : known(definition.values.indexOf(peer)),
                payload: known(payload),
                quantity: known(1),
                divisor: known(1),
                bypass: known(bypass),
                expected: known(value),
              }
              fixtures.push({ name: name + '_' + origin, row, expected })
              if (expected.kind === 'True')
                fixtures.push({
                  name: name + '_' + origin,
                  row: { ...row, expected: known('wrong') },
                  expected: { kind: 'False' },
                })
            }
          }
        }
    const crossDatabase = []
    for (const database of [pg, other])
      crossDatabase.push(
        (
          await database.query<{ range: string; first: string; last: string; first_hash: number }>(
            'SELECT enum_range(NULL::support_stage)::text range,enum_first(NULL::support_stage)::text first,enum_last(NULL::support_stage)::text last,hashenum(enum_first(NULL::support_stage)) first_hash',
          )
        ).rows[0],
      )
    expect(crossDatabase[0]!.range).toBe(crossDatabase[1]!.range)
    expect(crossDatabase[0]!.first_hash).not.toBe(crossDatabase[1]!.first_hash)
    await mkdir('artifacts/enum-support', { recursive: true })
    await writeFile(
      'artifacts/enum-support/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/enum-support/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/enum-support/identity.json',
      JSON.stringify(
        {
          labels: definition.values,
          sourceOids: definition.valueOids,
          foreignOids: foreignDefinition.valueOids,
          evaluatorSourceIdentical: true,
          crossDatabase,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'enumsupport',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await other.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 400_000)
