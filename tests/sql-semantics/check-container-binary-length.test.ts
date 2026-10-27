import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { readCompositeFixture } from './check-composite-fixtures.js'

const families = [
  ['int4', '123'],
  ['int8', "'9223372036854775807'"],
  ['numeric', "'1234567890.0012300'"],
  ['bool', 'true'],
  ['float8', "'-0'"],
  ['bytea', "'\\x00ff1234'"],
  ['text', "'ASCII'"],
  ['text', "'雪😊'"],
  ['char(4)', "'é'"],
  ['name', "'雪'"],
  ['refcursor', "'雪'"],
  ['date', "'0001-03-01 BC'"],
  ['timestamp', "'2000-01-01 12:34:56.123456'"],
  ['timestamptz', "'2021-11-07 05:30+00'"],
  ['time', "'24:00'"],
  ['timetz', "'12:34:56+05:30'"],
  ['interval', "'-2 mons 3 days 12:34:56.123456'"],
  ['json', '\'{"a": [1.00,null]}\''],
  ['jsonb', '\'{"é": [1.00,null]}\''],
  ['xml', "'<x>雪</x>'"],
  ['stage', "'雪'"],
  ['bounded', '3'],
  ['bag', "'{1,NULL,3}'"],
  ['int4range', "'[1,9)'"],
  ['int4multirange', "'{[1,3),[7,9)}'"],
  ['pair', "ROW(3,'a'::stage)"],
  ['tsvector', "'''cat'':1A,3 ''dog'':2'"],
  ['tsquery', "'cat & dog'"],
  ['aclitem', 'NULL'],
  ['int2vector', "'1 2'"],
  ['oidvector', "'0 4294967295'"],
  ['int2vector', "''"],
  ['oidvector', "''"],
] as const

const packet = 'artifacts/goal-checks/container-binary-length-active'
const errorOutcome = (code: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('recovers recursive binary lengths while withholding deployment headers across SQL-coerced public inputs and INSERTs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-container-binary-length-'))
  try {
    await pg.exec(`SET TimeZone='UTC';CREATE TYPE stage AS ENUM('a','雪');
      CREATE DOMAIN bounded AS int4 CHECK(VALUE BETWEEN 0 AND 9);
      CREATE DOMAIN bag AS int4[];CREATE TYPE pair AS(n int4,label stage);`)
    const forms = [
      { name: 'array', slot: 0, output: 'octet_length(array_send((value).items))' },
      { name: 'record', slot: 1, output: 'length(record_send(value))' },
      { name: 'nested', slot: 2, output: 'octet_length(record_send(ROW(value,ARRAY[value])))' },
    ]
    for (const [index, [type]] of families.entries()) {
      await pg.exec(`CREATE TYPE frame_${index} AS(items ${type}[]);
        CREATE TABLE inputs_${index}(value frame_${index},expected int4,bypass bool,kind int4,
        ${forms.map((form) => `CONSTRAINT "${form.name}" CHECK(kind<>${form.slot} OR bypass OR ${form.output} IS NOT DISTINCT FROM expected)`).join(',')});`)
    }
    const catalog = await snapshotCatalog(pg)
    const names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const [index] of families.entries()) {
      const table = catalog.tables.find((t) => t.name === `inputs_${index}`)!
      for (const form of forms)
        for (const origin of ['source', 'stored'] as const) {
          const name = `f${index}_${form.name}_${origin}`
          const lowered = lowerTableCheck(
            table,
            table.constraints.find((c) => c.name === form.name)!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(kind<>${form.slot} OR bypass OR ${form.output} IS NOT DISTINCT FROM expected)`
              : undefined,
          )!
          expect(hasUncertain(lowered.expression), name).toBe(false)
          const expression = portableCheckAtoms(lowered.expression)
          expect(hasUncertain(expression), name).toBe(false)
          names.push(name)
          plans.push({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name,
            },
            expression,
          })
        }
    }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      timeZone: 'UTC',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        names[index] + ':' + JSON.stringify(check.kind === 'unsupported' ? check : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    let inserts = 0
    for (const [index, [type, literal]] of families.entries()) {
      const first = group.checks[index * forms.length * 2]!
      if (first.kind !== 'supported') throw Error('Missing family')
      const inputType = first.inputs.find((i) => i.name === 'value')!.type
      const arrays = [
        `NULL::frame_${index}`,
        `ROW(NULL::${type}[])::frame_${index}`,
        `ROW(ARRAY[]::${type}[])::frame_${index}`,
        `ROW(ARRAY[NULL::${type}])::frame_${index}`,
        `ROW(ARRAY[${literal}::${type},NULL::${type}])::frame_${index}`,
        `ROW(array_fill(${literal}::${type},ARRAY[2,2],ARRAY[-3,7]))::frame_${index}`,
      ]
      for (const [sample, value] of arrays.entries()) {
        const payload = await readCompositeFixture(pg, `SELECT ${value} value`, 'value', inputType)
        const row: Row = {
          value: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
          bypass: { kind: 'Value', value: false },
        }
        for (const form of forms) {
          let expected: number | null = null,
            code: string | undefined
          try {
            expected = (
              await pg.query<{ value: number | null }>(
                `SELECT ${form.output} value FROM (SELECT ${value} value) input`,
              )
            ).rows[0]!.value
          } catch (error) {
            code = (error as { code: string }).code
            expect(code).toBe('42883')
            expect(type).toBe('aclitem')
          }
          for (const mismatch of [false, true]) {
            const wanted = expected === null ? (mismatch ? 7 : null) : expected + (mismatch ? 1 : 0)
            const outcome: Outcome = code
              ? errorOutcome(code)
              : { kind: mismatch ? 'False' : 'True' }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `f${index}_${form.name}_${origin}`,
                row: {
                  ...row,
                  kind: { kind: 'Value', value: form.slot },
                  expected: wanted === null ? { kind: 'Null' } : { kind: 'Value', value: wanted },
                },
                expected: outcome,
              })
            const insert = pg.query(
              `INSERT INTO inputs_${index}(value,expected,bypass,kind) VALUES(${value},$1,false,${form.slot})`,
              [wanted],
            )
            if (code) await expect(insert).rejects.toMatchObject({ code })
            else if (mismatch) await expect(insert).rejects.toMatchObject({ code: '23514' })
            else await insert
            inserts++
          }
          observations.push({
            family: index,
            type,
            sample,
            form: form.name,
            expected,
            error: code ?? null,
          })
        }
      }
    }
    await runCheckParity(root, 'container_binary_lengths', group, names, fixtures)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          families: families.length,
          checks: names.length,
          fixtures: fixtures.length,
          inserts,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('preserves native child send error order when an earlier encoding-dependent result is unknown', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-container-binary-order-'))
  try {
    await pg.exec(`CREATE TYPE cautious AS(first text,last aclitem);
      CREATE TABLE cautious_values(value cautious,CONSTRAINT valid CHECK(record_send(value) IS NULL));
      CREATE TABLE encoding_oracle(value cautious);
      INSERT INTO encoding_oracle SELECT ROW('雪',makeaclitem(0::oid,0::oid,'SELECT',false))::cautious;`)
    const code = await pg.query('SELECT record_send(value) FROM encoding_oracle').then(
      () => '',
      (e: { code: string }) => e.code,
    )
    expect(code).toBe('42883')
    const native = [{ clientEncoding: 'UTF8', code }]
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'cautious_values')!
    const plans = [0, 1].map((profile) => ({
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: 'p' + profile,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          'stored',
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
      ),
    }))
    const groups = plans.map((plan, index) =>
      prepareCheckRustGroup([plan], {
        serverEncoding: 'UTF8',
        clientEncoding: index === 0 ? 'UTF8' : undefined,
      }),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        requiresRegex: false,
        evaluatorSource,
        source: assembleCheckRust({
          source: evaluatorSource,
          callables: [
            ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
          ],
        }),
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [profile, check] of group.checks.entries()) {
      expect(check.kind).toBe('supported')
      for (const label of ['ASCII', '雪'])
        for (const nullAcl of [true, false])
          fixtures.push({
            name: 'p' + profile,
            row: {
              value: {
                kind: 'Value',
                value: {
                  typeName: 'public.cautious',
                  fields: [
                    { kind: 'Text', value: label },
                    nullAcl
                      ? { kind: 'Null' }
                      : {
                          kind: 'Aclitem',
                          value: { grantee: 0n, grantor: 0n, privileges: 2n, grantOptions: 0n },
                        },
                  ],
                },
              },
            },
            expected:
              profile === 1 && label === '雪'
                ? { kind: 'Unknown' }
                : nullAcl
                  ? { kind: 'False' }
                  : errorOutcome('42883'),
          })
    }
    await runCheckParity(
      root,
      'container_binary_order',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/error-order-summary.json',
      JSON.stringify(
        {
          checks: plans.length,
          fixtures: fixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          native,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('uses declared client UTF8 for exact JSONPath send bytes without container headers', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-container-jsonpath-wire-'))
  const sql =
    'CASE WHEN bypass THEN true ELSE jsonpath_send(source::jsonpath) IS NOT DISTINCT FROM expected END'
  try {
    await pg.exec(
      `CREATE TABLE paths(source text,expected bytea,bypass bool,CONSTRAINT valid CHECK(${sql}))`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'paths')!
    const names = ['source', 'stored'],
      plans = names.map((origin) => ({
        identity: { schema: 'public', kind: 'table' as const, owner: 'paths', constraint: origin },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${sql})` : undefined,
          )!.expression,
        ),
      }))
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
    })
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const source of ['$.a[0]', '$ ."雪"[0]', '$ ."😊雪"', null, 'bad']) {
      let wire: string | null = null,
        code: string | undefined
      try {
        wire = (
          await pg.query<{ wire: string | null }>(
            "SELECT encode(jsonpath_send($1::jsonpath),'hex') wire",
            [source],
          )
        ).rows[0]!.wire
      } catch (e) {
        code = (e as { code: string }).code
      }
      for (const name of names)
        fixtures.push({
          name,
          row: {
            source: source === null ? { kind: 'Null' } : { kind: 'Value', value: source },
            expected: wire === null ? { kind: 'Null' } : { kind: 'Value', value: wire },
            bypass: { kind: 'Value', value: false },
          },
          expected: code ? errorOutcome(code) : { kind: 'True' },
        })
    }
    await runCheckParity(root, 'container_jsonpath_wire', group, names, fixtures)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/jsonpath-wire-summary.json',
      JSON.stringify(
        { checks: names.length, fixtures: fixtures.length, targets: ['Rust', 'Go', 'TypeScript'] },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('retains geometry and JSONPath binary lengths through casts, semantic NaNs, missing encoding, lazy branches and errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-container-binary-parsed-'))
  const families = [
    ['point', '(NaN,-0)'],
    ['line', '{1,2,3}'],
    ['lseg', '[(0,0),(1,1)]'],
    ['box', '(1,1),(0,0)'],
    ['path', '[(0,0),(1,1)]'],
    ['polygon', '((0,0),(1,0),(0,1))'],
    ['circle', '<(0,0),1>'],
    ['jsonpath', '$ ."雪"[0]'],
  ] as const
  try {
    const forms = families.flatMap(([type], index) => [
      {
        index,
        type,
        name: `parsed_${index}_array`,
        output: `length(array_send(ARRAY[source::${type},NULL::${type}]))`,
      },
      {
        index,
        type,
        name: `parsed_${index}_record`,
        output: `octet_length(record_send(ROW(source::${type})))`,
      },
    ])
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(source text,expected int4,bypass bool,CONSTRAINT matches CHECK(CASE WHEN bypass THEN true ELSE ${f.output} IS NOT DISTINCT FROM expected END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const profile of [0, 1])
      for (const f of forms)
        for (const origin of ['source', 'stored'] as const) {
          const table = catalog.tables.find((t) => t.name === f.name)!,
            name = `p${profile}_${f.name}_${origin}`
          const lowered = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.output} IS NOT DISTINCT FROM expected END)`
              : undefined,
          )!
          expect(hasUncertain(lowered.expression), name).toBe(false)
          names.push(name)
          plans.push({
            identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: name },
            expression: portableCheckAtoms(lowered.expression),
          })
        }
    const groups = [0, 1].map((profile) =>
      prepareCheckRustGroup(
        plans.slice(profile * forms.length * 2, (profile + 1) * forms.length * 2),
        {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          clientEncoding: profile === 0 ? 'UTF8' : undefined,
          arrayNulls: true,
        },
      ),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        requiresRegex: groups.some((g) => g.requiresRegex),
        evaluatorSource,
        source: assembleCheckRust({
          source: evaluatorSource,
          requiresRegex: groups.some((g) => g.requiresRegex),
          callables: [
            ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
          ],
        }),
      }
    for (const [index, c] of group.checks.entries()) expect(c.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    for (const f of forms)
      for (const source of [families[f.index]![1], null, 'bad']) {
        let expected: number | null = null,
          code: string | undefined
        try {
          expected = (
            await pg.query<{ value: number | null }>(
              `SELECT ${f.output} value FROM (SELECT $1::text source) input`,
              [source],
            )
          ).rows[0]!.value
        } catch (e) {
          code = (e as { code: string }).code
        }
        for (const profile of [0, 1])
          for (const origin of ['source', 'stored'])
            for (const bypass of [false, true]) {
              const deferred =
                profile === 1 && f.type === 'jsonpath' && source !== null && code === undefined
              fixtures.push({
                name: `p${profile}_${f.name}_${origin}`,
                row: {
                  source: source === null ? { kind: 'Null' } : { kind: 'Value', value: source },
                  expected:
                    expected === null ? { kind: 'Null' } : { kind: 'Value', value: expected },
                  bypass: { kind: 'Value', value: bypass },
                },
                expected: bypass
                  ? { kind: 'True' }
                  : code
                    ? errorOutcome(code)
                    : { kind: deferred ? 'Unknown' : 'True' },
              })
            }
        observations.push({ type: f.type, form: f.name, source, expected, error: code ?? null })
      }
    for (const f of forms)
      for (const profile of [0, 1])
        for (const origin of ['source', 'stored']) {
          const name = `p${profile}_${f.name}_${origin}`,
            base: Row = {
              source: { kind: 'Unknown' },
              expected: { kind: 'Unknown' },
              bypass: { kind: 'Value', value: false },
            }
          fixtures.push(
            { name, row: base, expected: { kind: 'Unknown' } },
            {
              name,
              row: { ...base, bypass: { kind: 'Value', value: true } },
              expected: { kind: 'True' },
            },
            {
              name,
              row: { ...base, source: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
              expected: errorOutcome('22012'),
            },
          )
        }
    await runCheckParity(root, 'container_binary_parsed', group, names, fixtures)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/parsed-summary.json',
      JSON.stringify(
        {
          families: families.length,
          checks: names.length,
          fixtures: fixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)
