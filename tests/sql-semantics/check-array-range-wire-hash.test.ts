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
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'

const input = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('hashes captured array bounds recursively and retains missing element support, enum catalog requirements and portable wire boundaries', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-range-wire-hash-'))
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');
CREATE DOMAIN bag AS int4[] CHECK(cardinality(VALUE)<=4);
CREATE DOMAIN bags AS bag;
CREATE TYPE ints_span AS RANGE(subtype=int4[],multirange_type_name=ints_set);
CREATE TYPE numeric_span AS RANGE(subtype=numeric[],multirange_type_name=numeric_set);
CREATE TYPE text_span AS RANGE(subtype=text[],collation="C",multirange_type_name=text_set);
CREATE TYPE jsonb_span AS RANGE(subtype=jsonb[],multirange_type_name=jsonb_set);
CREATE TYPE domain_span AS RANGE(subtype=bags,multirange_type_name=domain_set);
CREATE TYPE nested_span AS RANGE(subtype=bag[],multirange_type_name=nested_set);
CREATE TYPE enum_span AS RANGE(subtype=stage[],multirange_type_name=enum_set);
CREATE TYPE json_span AS RANGE(subtype=json[],multirange_type_name=json_set);
CREATE TYPE money_span AS RANGE(subtype=money[],multirange_type_name=money_set);`)
    const profiles = customRangeProfiles(await snapshotCatalog(pg))
    expect(profiles).toHaveLength(9)
    const families = profiles.map((p, index) => ({
      p,
      index,
      history: `array_hash_history_${index}`,
    }))
    for (const f of families) await pg.exec(`CREATE DOMAIN ${f.history} AS ${f.p.identity}[]`)
    const forms = families.flatMap((f) =>
      Object.entries({
        hash: { expr: 'hash_range(v)', extended: false },
        extended: { expr: 'hash_range_extended(v,seed)', extended: true },
        multi: { expr: 'hash_multirange(m)', extended: false },
        multi_extended: { expr: 'hash_multirange_extended(m,seed)', extended: true },
        array: { expr: 'hash_array(items)', extended: false },
        array_extended: { expr: 'hash_array_extended(items,seed)', extended: true },
        nested: { expr: `hash_array(ARRAY[items::${f.history}])`, extended: false },
        nested_extended: {
          expr: `hash_array_extended(ARRAY[items::${f.history}],seed)`,
          extended: true,
        },
        literal: { expr: `hash_range('empty'::${f.p.identity})`, extended: false },
        array_literal: { expr: `hash_array('{}'::${f.p.identity}[])`, extended: false },
        wire: { expr: `encode(range_send(v),'hex')`, extended: false },
        multi_wire: { expr: `encode(multirange_send(m),'hex')`, extended: false },
      }).map(([name, form]) => {
        const output = name.includes('wire') ? form.expr : `(${form.expr})::text`
        return {
          ...f,
          ...form,
          name,
          table: `array_hash_${f.index}_${name}`,
          sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
          output,
        }
      }),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(v ${f.p.identity},m ${f.p.multirange},items ${f.p.identity}[],seed bigint,expected text,bypass boolean,CONSTRAINT matches CHECK(${f.sql}))`,
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
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'little',
        arrayNulls: true,
      })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.identity.owner + ': ' + JSON.stringify(c).slice(0, 1200)).toBe(
        'supported',
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      deferred = 0
    for (const f of families) {
      const a =
          f.p.name === 'enum_span'
            ? '{z}'
            : f.p.name === 'text_span'
              ? '{a}'
              : f.p.name === 'nested_span'
                ? '{"{1}"}'
                : '{1}',
        b =
          f.p.name === 'enum_span'
            ? '{a}'
            : f.p.name === 'text_span'
              ? '{é}'
              : f.p.name === 'nested_span'
                ? '{"{3}"}'
                : '{3}',
        samples = [
          null,
          'empty',
          '(,)',
          scalarRangeText('{}', null),
          scalarRangeText('{NULL}', null),
          scalarRangeText(a, null),
        ]
      if (!['json_span', 'money_span'].includes(f.p.name))
        samples.push(scalarRangeText(a, b), scalarRangeText(a, a))
      if (f.p.name === 'ints_span') samples.push(scalarRangeText('[-2:-1]={1,2}', '{3}'))
      for (const text of samples) {
        const v = await readRangeFixture(
            pg,
            `SELECT $1::${f.p.identity} span`,
            'span',
            f.p.rangeType,
            [text],
          ),
          mtext = text === null ? null : '{' + text + '}',
          m = await readMultirangeFixture(pg, f.p.multirangeType, mtext),
          itemstext = text === null ? null : rangeArrayText([text, null, 'empty'], -2),
          items = await readRangeArrayFixture(pg, f.p.rangeType, itemstext)
        const row: Row = {
          v: input(v),
          m: input(m),
          items: input(items),
          seed: input(0n),
          expected: input(null),
          bypass: input(false),
        }
        const finite = v !== null && !v.empty && v.bounds.some((b) => b.kind !== 'Null'),
          enumValue =
            f.p.name === 'enum_span' &&
            text !== null &&
            text.includes('{' + (text.includes('{z}') ? 'z' : 'a') + '}')
        for (const form of forms.filter((x) => x.index === f.index))
          for (const seed of form.extended ? [null, 0n, -9223372036854775808n] : [0n]) {
            let rendered: string | null = null,
              failure: string | undefined
            try {
              rendered = (
                await pg.query<{ value: string | null }>(
                  `SELECT ${form.output} value FROM(SELECT $1::${f.p.identity} v,$2::${f.p.multirange} m,$3::${f.p.identity}[] items,$4::bigint seed)q`,
                  [text, mtext, itemstext, seed === null ? null : String(seed)],
                )
              ).rows[0]!.value
            } catch (e) {
              failure = (e as { code: string }).code
            }
            for (const wrong of [false, true])
              for (const bypass of [false, true]) {
                const expected = wrong ? 'wrong' : rendered
                let native: Outcome
                try {
                  await pg.query(`INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5,$6)`, [
                    text,
                    mtext,
                    itemstext,
                    seed === null ? null : String(seed),
                    expected,
                    bypass,
                  ])
                  native = { kind: 'True' }
                } catch (e) {
                  const code = (e as { code: string }).code
                  native =
                    code === '23514'
                      ? { kind: 'False' }
                      : { kind: 'Error', value: { state: parseInt(code, 36) } }
                }
                inserts++
                const unknown =
                  !bypass &&
                  !failure &&
                  ((form.name.includes('wire') && finite) ||
                    (!form.name.includes('literal') &&
                      !form.name.includes('wire') &&
                      enumValue &&
                      (!form.extended || seed !== null)))
                const result: Outcome = unknown ? { kind: 'Unknown' } : native
                if (unknown) deferred++
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: form.table + '_' + origin,
                    row: {
                      ...row,
                      seed: input(seed),
                      expected: input(expected),
                      bypass: input(bypass),
                    },
                    expected: result,
                  })
                references.push({
                  type: f.p.identity,
                  form: form.name,
                  text,
                  seed: seed === null ? null : String(seed),
                  wrong,
                  bypass,
                  failure,
                  native,
                  expected: result,
                })
              }
          }
      }
    }
    expect(deferred).toBeGreaterThan(0)
    await mkdir('artifacts/array-range-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/array-range-wire-hash/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          forms: forms.length,
          fixtures: fixtures.length,
          inserts,
          deferred,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile('artifacts/array-range-wire-hash/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      directory,
      'arrayrangewirehash',
      group,
      plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
