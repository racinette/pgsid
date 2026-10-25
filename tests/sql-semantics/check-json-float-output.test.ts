import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('shares float formatting context across JSON values, keys, arrays, records and geometry while recovering invariant JSONB numbers', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-json-float-output-')),
    artifact = 'artifacts/goal-checks/json-float-output-active'
  try {
    const types = [
        {
          name: 'single',
          type: 'float4',
          values: [
            '-0',
            '0',
            '1',
            '10',
            '1.25',
            '1.2345678901234567',
            '1e-40',
            '1e20',
            'NaN',
            'Infinity',
            '-Infinity',
          ],
        },
        {
          name: 'double',
          type: 'float8',
          values: [
            '-0',
            '0',
            '1',
            '10',
            '1.25',
            '1.2345678901234567',
            '1e-300',
            '1e20',
            'NaN',
            'Infinity',
            '-Infinity',
          ],
        },
        {
          name: 'point',
          type: 'point',
          values: ['(1.2345678901234567,-0)', '(1,2)', '(10,0)', '(NaN,Infinity)'],
        },
        {
          name: 'line',
          type: 'line',
          values: ['{1.2345678901234567,2.5,-0}', '{1,2,3}', '{NaN,2,3}'],
        },
        {
          name: 'segment',
          type: 'lseg',
          values: ['[(1.2345678901234567,-0),(2.5,3.5)]', '[(1,2),(3,4)]', '[(NaN,2),(3,4)]'],
        },
        {
          name: 'box',
          type: 'box',
          values: ['(1.2345678901234567,-0),(2.5,3.5)', '(1,2),(3,4)', '(NaN,2),(3,4)'],
        },
        {
          name: 'circle',
          type: 'circle',
          values: ['<(1.2345678901234567,-0),2.5>', '<(1,2),3>', '<(NaN,2),3>'],
        },
        {
          name: 'path',
          type: 'path',
          values: ['[(1.2345678901234567,-0),(2.5,3.5)]', '((1,2),(3,4))', '[(NaN,2),(3,4)]'],
        },
        {
          name: 'polygon',
          type: 'polygon',
          values: [
            '((1.2345678901234567,-0),(2.5,3.5),(4.5,5.5))',
            '((1,2),(3,4),(5,6))',
            '((NaN,2),(3,4),(5,6))',
          ],
        },
      ],
      forms: { name: string; output: string; values: readonly (string | null)[] }[] = []
    for (const item of types) {
      await pg.exec(`CREATE TYPE packet_${item.name} AS(v ${item.type},a ${item.type}[])`)
      const v = `payload::${item.type}`,
        a = `ARRAY[${v},NULL::${item.type}]`,
        r = `ROW(${v},${a})::packet_${item.name}`
      for (const [name, output] of [
        ['raw', `to_json(${v})::text`],
        ['binary', `to_jsonb(${v})::text`],
        [
          'bundle',
          `json_build_array(
          json_build_object(${v},${v})::text,jsonb_build_object(${v},${v})::text,
          array_to_json(ARRAY[${a},${a}],true)::text,to_jsonb(ARRAY[${a},${a}])::text,
          json_build_array(VARIADIC ${a})::text,jsonb_build_array(VARIADIC ${a})::text,
          json_build_object(VARIADIC ARRAY[${v},${v}])::text,
          jsonb_build_object(VARIADIC ARRAY[${v},${v}])::text,
          row_to_json(${r},true)::text,to_jsonb(${r})::text)::text`,
        ],
      ])
        forms.push({
          name: item.name + '_' + name,
          output: output!,
          values: [...item.values, null, 'bad'],
        })
    }
    await pg.exec(`CREATE TABLE json_float_input(payload text,bypass bool,expected text,
      ${forms.map((f) => `CONSTRAINT ${f.name} CHECK((CASE WHEN bypass THEN expected ELSE ${f.output} END) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C")`).join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'json_float_input')!,
      profiles = [-3, 0, 3, undefined] as const,
      names: string[] = [],
      groups = profiles.map((extra) => {
        const profile = extra === undefined ? 'missing' : 'p' + String(extra).replace('-', 'm'),
          plans = forms.flatMap((form) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `${profile}_${form.name}_${origin}`,
                constraint = table.constraints.find((c) => c.name === form.name)!
              names.push(name)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: profile,
                  constraint: name,
                },
                expression: lowerTableCheck(
                  table,
                  constraint,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                  catalog.compositeTypeGraph,
                  origin === 'source'
                    ? `CHECK((CASE WHEN bypass THEN expected ELSE ${form.output} END) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C")`
                    : undefined,
                )!.expression,
              }
            }),
          )
        return prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          ...(extra === undefined ? {} : { extraFloatDigits: extra }),
        })
      }),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource, callables: [] }),
        requiresRegex: false,
      },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const settings = Array.from({ length: 19 }, (_, index) => index - 15)
    for (const form of forms)
      for (const payload of form.values) {
        const observations = new Map<number, { output: string | null; expected: Outcome }>()
        for (const extra of settings) {
          await pg.exec(`SET extra_float_digits=${extra}`)
          try {
            const output = (
              await pg.query<{ output: string | null }>(
                `SELECT (${form.output}) output FROM (SELECT $1::text payload) candidate`,
                [payload],
              )
            ).rows[0]!.output
            observations.set(extra, { output, expected: { kind: 'True' } })
          } catch (cause) {
            observations.set(extra, {
              output: null,
              expected: {
                kind: 'Error',
                value: { state: parseInt((cause as { code: string }).code, 36) },
              },
            })
          }
        }
        const invariant =
          new Set([...observations.values()].map((v) => JSON.stringify(v))).size === 1
        references.push({
          name: form.name,
          payload,
          invariant,
          observations: Object.fromEntries(observations),
        })
        for (const extra of profiles)
          for (const origin of ['source', 'stored']) {
            const profile = extra === undefined ? 'missing' : 'p' + String(extra).replace('-', 'm'),
              reference = observations.get(extra ?? 3)!,
              name = `${profile}_${form.name}_${origin}`,
              row = {
                payload: input(payload),
                bypass: input(false),
                expected: input(reference.output),
              },
              expected: Outcome =
                extra === undefined && !invariant ? { kind: 'Unknown' } : reference.expected
            fixtures.push({ name, row, expected })
            if (reference.expected.kind === 'True')
              fixtures.push({
                name,
                row: { ...row, expected: input('wrong') },
                expected: expected.kind === 'Unknown' ? expected : { kind: 'False' },
              })
          }
      }
    for (const name of names) {
      const base = {
        payload: { kind: 'Unknown' } as Input,
        bypass: input(false),
        expected: input('safe'),
      }
      fixtures.push({ name, row: base, expected: { kind: 'Unknown' } })
      fixtures.push({ name, row: { ...base, bypass: input(true) }, expected: { kind: 'True' } })
      fixtures.push({
        name,
        row: { ...base, payload: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
    }
    await mkdir(artifact, { recursive: true })
    for (const [file, value] of Object.entries({ references, fixtures }))
      await writeFile(join(artifact, file + '.json'), JSON.stringify(value, null, 2) + '\n')
    await writeFile(join(artifact, 'evaluators.rs'), evaluatorSource)
    await runCheckParity(root, 'example.com/json-float-output', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)

it('recovers invariant JSONB numeric cells independently of array object keys without formatting context', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-json-float-invariants-'))
  try {
    const forms = {
      single_object: 'jsonb_build_object(VARIADIC ARRAY[1::real,payload::real])::text',
      double_object: 'jsonb_build_object(VARIADIC ARRAY[1::float8,payload::float8])::text',
      double_array: 'to_jsonb(ARRAY[payload::float8,NULL])::text',
      double_record: 'to_jsonb(ROW(payload::float8,ARRAY[payload::float8]))::text',
      double_key: 'jsonb_build_object(VARIADIC ARRAY[payload::float8,1::float8])::text',
    }
    await pg.exec(`CREATE TABLE invariant_inputs(payload text,expected text,
      ${Object.entries(forms)
        .map(
          ([name, sql]) =>
            `CONSTRAINT ${name} CHECK((${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C")`,
        )
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'invariant_inputs')!,
      names = Object.keys(forms),
      plans = names.map((name) => ({
        identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
        expression: lowerTableCheck(
          table,
          table.constraints.find((c) => c.name === name)!,
          [],
          [],
        )!.expression,
      })),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: { name: string; outputs: string[] }[] = []
    for (const [name, sql] of Object.entries(forms)) {
      const outputs: string[] = []
      for (let extra = -15; extra <= 3; extra++) {
        await pg.exec(`SET extra_float_digits=${extra}`)
        outputs.push(
          (
            await pg.query<{ output: string }>(
              `SELECT (${sql}) output FROM (SELECT '10'::text payload) candidate`,
            )
          ).rows[0]!.output,
        )
      }
      expect(new Set(outputs).size === 1, name).toBe(name !== 'double_key')
      references.push({ name, outputs })
      fixtures.push({
        name,
        row: { payload: input('10'), expected: input(outputs[0]!) },
        expected: { kind: name === 'double_key' ? 'Unknown' : 'True' },
      })
      fixtures.push({
        name,
        row: { payload: input('10'), expected: input('wrong') },
        expected: { kind: name === 'double_key' ? 'Unknown' : 'False' },
      })
    }
    await mkdir('artifacts/goal-checks/json-float-output-active', { recursive: true })
    for (const [name, value] of Object.entries({ references, fixtures }))
      await writeFile(
        `artifacts/goal-checks/json-float-output-active/invariant-${name}.json`,
        JSON.stringify(value, null, 2) + '\n',
      )
    await runCheckParity(root, 'example.com/json-float-invariants', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 180_000)
