import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
it('retains reached collation and encoding requirements, known empty and NULL cases, safe Unknown shape and borrowed large-array scans', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-quantifier-context-'))
  try {
    await pg.exec(
      "CREATE COLLATION quantified_locale(provider=icu,locale='und',deterministic=false);CREATE TABLE quantifier_context(probe text,payload text,quantity integer,bypass boolean);CREATE TABLE quantifier_context_oracle(LIKE quantifier_context)",
    )
    const doc = 'probe::jsonb < ANY(payload::jsonb[])',
      text = 'probe COLLATE quantified_locale < ALL(payload::text[] COLLATE quantified_locale)'
    const forms = {
      doc,
      text,
      doc_shape: `cardinality(ARRAY[${doc}])=1`,
      text_shape: `cardinality(ARRAY[${text}])=1`,
      doc_lazy: `CASE WHEN bypass THEN true ELSE ${doc} END`,
      text_lazy: `CASE WHEN bypass THEN true ELSE ${text} END`,
      scan_any: 'quantity=ANY(payload::integer[])',
      scan_all: 'quantity<ALL(payload::integer[])',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE quantifier_context ADD CONSTRAINT ${name} CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'quantifier_context')!
    const contexts = {
      complete: {
        arrayNulls: true,
        defaultCollation: 'C' as const,
        serverEncoding: 'UTF8' as const,
      },
      no_collation: { arrayNulls: true, serverEncoding: 'UTF8' as const },
      no_encoding: { arrayNulls: true, defaultCollation: 'C' as const },
    }
    const groups = Object.entries(contexts).map(([context, settings]) => {
      const plans = Object.entries(forms).flatMap(([name, sql]) =>
        (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: context + '_' + name + '_' + origin,
          },
          expression: lowerTableCheck(
            table,
            origin === 'source'
              ? { name, type: 'check', definition: `CHECK(${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            [],
            [],
            origin,
          )!.expression,
        })),
      )
      for (const p of plans) expect(hasUncertain(p.expression), p.identity.constraint).toBe(false)
      const group = prepareCheckRustGroup(plans, settings)
      for (const check of group.checks)
        expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
      return { group, names: plans.map((p) => p.identity.constraint) }
    })
    const first = groups[0]!.group,
      evaluatorSource = groups.map((g) => g.group.evaluatorSource!).join('\n')
    const group = {
      ...first,
      checks: groups.flatMap((g) => g.group.checks),
      evaluatorSource,
      source: {
        ...first.source!,
        modules: first.source!.modules.map((m) =>
          m.name === 'checks'
            ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
            : m,
        ),
      },
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (
      context: string,
      name: string,
      probe: string | null,
      payload: string | null,
      expected: Outcome,
      bypass = false,
      quantity = 0,
    ) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: context + '_' + name + '_' + origin,
          row: {
            probe: known(probe),
            payload: known(payload),
            quantity: known(quantity),
            bypass: known(bypass),
          },
          expected,
        })
    }
    const samples: [string | null, string | null][] = [
      ['0', '{1,2}'],
      ['0', '{}'],
      ['0', '{NULL}'],
      [null, '{1}'],
      [null, '{}'],
      ['0', null],
      ['bad', '{}'],
      ['0', '{bad}'],
    ]
    for (const [probe, payload] of samples) {
      await pg.exec('DELETE FROM quantifier_context_oracle')
      await pg.query('INSERT INTO quantifier_context_oracle VALUES($1,$2,0,false)', [
        probe,
        payload,
      ])
      let actual: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${doc}) value FROM quantifier_context_oracle`,
          )
        ).rows[0]!.value
        actual = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        actual = { kind: 'Error', value: { state: parseInt((error as { code: string }).code, 36) } }
      }
      observations.push({ probe, payload, actual })
      for (const context of Object.keys(contexts)) {
        const result =
          context === 'complete' || actual.kind === 'Error' || probe === null || payload !== '{1,2}'
            ? actual
            : ({ kind: 'Unknown' } as Outcome)
        add(context, 'doc', probe, payload, result)
        add(
          context,
          'doc_shape',
          probe,
          payload,
          actual.kind === 'Error' ? actual : { kind: 'True' },
        )
        add(context, 'doc_lazy', probe, payload, { kind: 'True' }, true)
      }
    }
    for (const [probe, payload, result] of [
      ['a', '{b,c}', { kind: 'Unknown' }],
      ['a', '{}', { kind: 'True' }],
      ['a', '{NULL}', { kind: 'Null' }],
      [null, '{[}', { kind: 'Null' }],
      ['a', null, { kind: 'Null' }],
    ] as const) {
      for (const context of Object.keys(contexts)) {
        add(context, 'text', probe, payload, result)
        add(context, 'text_shape', probe, payload, { kind: 'True' })
        add(context, 'text_lazy', probe, payload, { kind: 'True' }, true)
      }
    }
    const cells = 50000,
      anyPayload = '{' + [...Array<string>(cells - 1).fill('0'), '1'].join(',') + '}',
      allPayload = '{' + [...Array<string>(cells - 1).fill('0'), 'NULL'].join(',') + '}'
    for (const [name, payload, quantity, expected] of [
      ['scan_any', anyPayload, 1, { kind: 'True' }],
      ['scan_all', allPayload, -1, { kind: 'Null' }],
    ] as const) {
      await pg.exec('DELETE FROM quantifier_context_oracle')
      await pg.query('INSERT INTO quantifier_context_oracle VALUES(NULL,$1,$2,false)', [
        payload,
        quantity,
      ])
      const value = (
        await pg.query<{ value: boolean | null }>(
          `SELECT (${forms[name]}) value FROM quantifier_context_oracle`,
        )
      ).rows[0]!.value
      expect(value).toBe(expected.kind === 'Null' ? null : true)
      add('complete', name, null, payload, expected, false, quantity)
    }
    await runCheckParity(
      directory,
      'arrayquantifiercontext',
      group,
      groups.flatMap((g) => g.names),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-quantifier/context-measurements.json',
      JSON.stringify({ fixtures: fixtures.length, cells, observations }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
