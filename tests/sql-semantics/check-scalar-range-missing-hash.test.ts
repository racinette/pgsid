import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'
import { arrayElementIdentity } from '../../src/codegen/shared/check-array-types.js'

const cell = (value: string | boolean | bigint | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('preserves missing subtype hash errors before empty ranges, multiranges and nested arrays while retaining strict seeds and lazy branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-scalar-range-missing-hash-'))
  try {
    await pg.exec(`
CREATE TYPE money_span AS RANGE(subtype=money,multirange_type_name=money_set);
CREATE DOMAIN money_bound AS money NOT NULL CHECK(VALUE>='0'::money);
CREATE TYPE checked_money_span AS RANGE(subtype=money_bound,multirange_type_name=checked_money_set);
`)
    const initial = await snapshotCatalog(pg),
      profiles = customRangeProfiles(initial)
    expect(profiles).toHaveLength(2)
    for (const profile of profiles) {
      expect(profile.subtypeHash).toBeNull()
      expect(profile.subtypeHashExtended).toBeNull()
    }
    const families = profiles.flatMap((profile, p) =>
      [false, true].map((multi) => ({
        profile,
        multi,
        index: p * 2 + Number(multi),
        type: multi ? profile.multirange : profile.identity,
      })),
    )
    for (const f of families) await pg.exec(`CREATE DOMAIN hash_history_${f.index} AS ${f.type}[]`)
    const forms = families.flatMap((f) =>
      Object.entries({
        hash: `hash_${f.multi ? 'multirange' : 'range'}(v)`,
        extended: `hash_${f.multi ? 'multirange' : 'range'}_extended(v,seed)`,
        array: 'hash_array(items)',
        array_extended: 'hash_array_extended(items,seed)',
        nested: `hash_array(ARRAY[items::hash_history_${f.index}])`,
        nested_extended: `hash_array_extended(ARRAY[items::hash_history_${f.index}],seed)`,
        literal: `hash_${f.multi ? 'multirange' : 'range'}('${f.multi ? '{}' : 'empty'}'::${f.type})`,
        literal_extended: `hash_${f.multi ? 'multirange' : 'range'}_extended('${f.multi ? '{}' : 'empty'}'::${f.type},seed)`,
        array_literal: `hash_array('{}'::${f.type}[])`,
        array_literal_extended: `hash_array_extended('{}'::${f.type}[],seed)`,
        nested_literal: `hash_array(ARRAY['{}'::hash_history_${f.index}])`,
      }).map(([name, output]) => ({
        ...f,
        name,
        output,
        table: `missing_hash_${f.index}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${output})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      })),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(v ${f.type},items ${f.type}[],seed bigint,expected text,bypass bool,CONSTRAINT matches CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: f.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { ...table.constraints[0]!, definition: `CHECK(${f.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C' })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.identity.owner + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const family of families)
      for (const raw of [null, 'empty', '(,)', '[0,1]']) {
        const text = family.multi && raw !== null ? (raw === 'empty' ? '{}' : `{${raw}}`) : raw,
          read = (text: string | null) =>
            family.multi
              ? readMultirangeFixture(pg, family.profile.multirangeType, text)
              : readRangeFixture(
                  pg,
                  `SELECT $1::${family.type} span`,
                  'span',
                  family.profile.rangeType,
                  [text],
                ),
          value = await read(text)
        for (const itemsText of [null, '{}', '{NULL}', rangeArrayText([text, null], -2)]) {
          const items = family.multi
            ? await readMultirangeArrayFixture(pg, family.profile.multirangeType, itemsText)
            : await readRangeArrayFixture(pg, family.profile.rangeType, itemsText)
          for (const form of forms.filter((f) => f.index === family.index))
            for (const seed of form.name.includes('extended') ? [0n, -1n, null] : [0n])
              for (const bypass of [false, true]) {
                if (form.name.includes('literal') && (raw !== 'empty' || itemsText !== '{}'))
                  continue
                let native: Outcome = { kind: 'True' }
                try {
                  await pg.query(
                    `INSERT INTO ${form.table}(v,items,seed,expected,bypass) VALUES($1,$2,$3,NULL,$4)`,
                    [text, itemsText, seed, bypass],
                  )
                } catch (error) {
                  const e = error as { code: string; constraint?: string }
                  native =
                    e.code === '23514' && e.constraint === 'matches'
                      ? { kind: 'False' }
                      : { kind: 'Error', value: { state: parseInt(e.code, 36) } }
                }
                references.push({
                  type: family.type,
                  form: form.name,
                  text,
                  itemsText,
                  seed,
                  bypass,
                  native,
                })
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: form.table + '_' + origin,
                    row: {
                      v: value === null ? { kind: 'Null' } : { kind: 'Value', value },
                      items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                      seed: cell(seed),
                      expected: cell(null),
                      bypass: cell(bypass),
                    },
                    expected: native,
                  })
              }
        }
        if (raw === '[0,1]') {
          const partial = structuredClone(value)!
          if ('bounds' in partial) partial.bounds = [{ kind: 'Unknown' }, { kind: 'Unknown' }]
          else {
            const range = partial.ranges[0]!
            if (range.kind !== 'Value') throw new Error('Expected nonempty member')
            range.value.bounds = [{ kind: 'Unknown' }, { kind: 'Unknown' }]
          }
          for (const form of forms.filter(
            (f) => f.index === family.index && !f.name.includes('literal'),
          ))
            for (const seed of [0n, null])
              for (const bypass of [false, true])
                for (const origin of ['source', 'stored']) {
                  const hashError: Outcome = {
                    kind: 'Error',
                    value: { state: parseInt('42883', 36) },
                  }
                  const row: Row = {
                    v: { kind: 'Value', value: partial },
                    seed: cell(seed),
                    items: {
                      kind: 'Value',
                      value: {
                        elementType: arrayElementIdentity(
                          family.multi ? family.profile.multirangeType : family.profile.rangeType,
                        ),
                        elementKind: family.multi ? 43 : 42,
                        dimensions: [{ lower: 1, length: 1 }],
                        elements: [
                          'bounds' in partial
                            ? { kind: 'Range', value: partial }
                            : { kind: 'Multirange', value: partial },
                        ],
                        nullBitmap: { kind: 'Value', value: false },
                      },
                    },
                    expected: cell(null),
                    bypass: cell(bypass),
                  }
                  fixtures.push({
                    name: form.table + '_' + origin,
                    row,
                    expected:
                      bypass || (form.name.includes('extended') && seed === null)
                        ? { kind: 'True' }
                        : hashError,
                  })
                }
          for (const form of forms.filter(
            (f) => f.index === family.index && ['hash', 'extended'].includes(f.name),
          ))
            for (const input of [
              { kind: 'Null' },
              { kind: 'Unknown' },
              { kind: 'Error', value: { state: parseInt('22012', 36) } },
            ] as Input[])
              for (const seed of [
                cell(0n),
                cell(null),
                { kind: 'Unknown' },
                { kind: 'Error', value: { state: parseInt('22003', 36) } },
              ] as Input[])
                for (const bypass of [false, true])
                  for (const origin of ['source', 'stored']) {
                    const expected: Outcome = bypass
                      ? { kind: 'True' }
                      : input.kind === 'Error'
                        ? input
                        : form.name === 'extended' && seed.kind === 'Error'
                          ? seed
                          : input.kind === 'Null' ||
                              (form.name === 'extended' && seed.kind === 'Null')
                            ? { kind: 'True' }
                            : { kind: 'Unknown' }
                    fixtures.push({
                      name: form.table + '_' + origin,
                      row: { v: input, seed, expected: cell(null), bypass: cell(bypass) },
                      expected,
                    })
                  }
        }
      }
    await mkdir('artifacts/scalar-range-missing-hash', { recursive: true })
    await writeFile(
      'artifacts/scalar-range-missing-hash/report.json',
      JSON.stringify(
        { plans: plans.length, inserts: references.length, fixtures: fixtures.length, references },
        (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'scalarrangemissinghash',
      group,
      plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
