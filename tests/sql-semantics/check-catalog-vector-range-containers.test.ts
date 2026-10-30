import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { catalogRangeType } from '../../src/sql-semantics/catalog-check-binder.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { rangeTypeProfile } from '../../src/sql-semantics/range-profiles.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import {
  readRangeFixture,
  readRangeBoundCell,
  rangeBoundProjection,
} from './check-range-fixtures.js'
import { readMultirangeQueryFixture } from './check-multirange-fixtures.js'

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('retains complete byte-order alternatives when hashing vector record bounds with context-sensitive fields', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-vector-record-hash-context-'))
  try {
    await pg.exec(`CREATE TYPE marked_vector AS(types oidvector,label text COLLATE "C");
      CREATE TYPE marked_span AS RANGE(subtype=marked_vector);
      CREATE TABLE marked_checks(v marked_span,expected_int int,expected_text text,
        CONSTRAINT hashed CHECK(hash_range(v)=expected_int),
        CONSTRAINT extended CHECK(hash_range_extended(v,-19)::text=expected_text));
      CREATE TABLE marked_input(v marked_span);
      INSERT INTO marked_input VALUES(marked_span(ROW('1'::oidvector,'alphabet é')::marked_vector,ROW('2'::oidvector,'different')::marked_vector));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'marked_checks')!
    const type = catalogRangeType(
      'public.marked_span',
      undefined,
      catalog.domains,
      catalog.rangeTypes,
    )!
    const v = known(await readRangeFixture(pg, 'SELECT * FROM marked_input', 'v', type))
    const result = (
      await pg.query<{ n: number; s: string }>(
        'SELECT hash_range(v) n,hash_range_extended(v,-19)::text s FROM marked_input',
      )
    ).rows[0]!
    const groups = []
    for (const nativeByteOrder of [undefined, 'little'] as const) {
      const plans = table.constraints.map((c) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name + '_' + (nativeByteOrder ?? 'unknown'),
        },
        expression: lowerTableCheck(
          table,
          c,
          [],
          catalog.domains,
          'stored',
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
      }))
      groups.push(
        prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          nativeByteOrder,
        }),
      )
    }
    for (const group of groups)
      expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n')
    const group = {
      source: assembleCheckRust({ source: evaluatorSource, callables: [] }),
      evaluatorSource,
      checks: groups.flatMap((g) => g.checks),
      requiresRegex: false,
    }
    const names: string[] = []
    for (const suffix of ['unknown', 'little'])
      for (const c of table.constraints) names.push(c.name + '_' + suffix)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const suffix of ['unknown', 'little'])
      for (const c of table.constraints)
        for (const wrong of [false, true]) {
          const n = result.n + (wrong ? 1 : 0),
            s = wrong ? 'different' : result.s
          const insertion = pg.query('INSERT INTO marked_checks SELECT v,$1,$2 FROM marked_input', [
            n,
            s,
          ])
          if (wrong) await expect(insertion).rejects.toMatchObject({ code: '23514' })
          else await insertion
          fixtures.push({
            name: c.name + '_' + suffix,
            row: { v, expected_int: known(n), expected_text: known(s) },
            expected: { kind: suffix === 'unknown' ? 'Unknown' : wrong ? 'False' : 'True' },
          })
        }
    await runCheckParity(root, 'vectorrecordhashcontext', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)

const families = [
  ['array_span', "ARRAY['100'::oidvector]", "ARRAY['1 2'::oidvector]"],
  [
    'domain_array_span',
    "ARRAY['100'::oidvector]::vector_bag",
    "ARRAY['1 2'::oidvector]::vector_bag",
  ],
  ['nested_span', "type_span('1','3')", "type_span('4','6')"],
  [
    'record_span',
    "ROW('1'::int2vector,'100'::oidvector)::vector_record",
    "ROW('1'::int2vector,'1 2'::oidvector)::vector_record",
  ],
] as const

it.each(families)(
  'composes selected vector support through array/domain, nested range and record subtypes with native INSERT parity: %s',
  async (family, a, b) => {
    const pg = await PGlite.create(),
      root = await mkdtemp(join(tmpdir(), 'pgsid-vector-range-containers-'))
    try {
      await pg.exec(`CREATE TYPE type_span AS RANGE(subtype=oidvector);
      CREATE DOMAIN vector_bag AS oidvector[] CHECK(cardinality(VALUE)<=3);
      CREATE TYPE vector_record AS(positions int2vector,type_ids oidvector);
      CREATE TYPE array_span AS RANGE(subtype=oidvector[]);
      CREATE TYPE domain_array_span AS RANGE(subtype=vector_bag);
      CREATE TYPE nested_span AS RANGE(subtype=type_span);
      CREATE TYPE record_span AS RANGE(subtype=vector_record);`)
      const initial = await snapshotCatalog(pg)
      {
        const type = catalogRangeType(
          'public.' + family,
          undefined,
          initial.domains,
          initial.rangeTypes,
        )!
        expect(type).not.toBeNull()
        const profile = rangeTypeProfile(type)!
        const operations: Record<string, string> = {
          output: 'v::text',
          contains: '(v @> a)::text',
          constructor: `public.${family}(a,b)::text`,
          input: `(input_text::public.${family})::text`,
          array_output: 'ARRAY[v,w]::text',
          multi_contains: '(m @> a)::text',
          multi_input: `((m::text)::${profile.multirange})::text`,
          json: 'to_jsonb(v)::text',
          hash: 'hash_range(v)::text',
          multi_hash: 'hash_multirange(m)::text',
          wire: 'octet_length(range_send(v))::text',
        }
        const definitions = Object.fromEntries(
          Object.entries(operations).map(([name, sql], mode) => [
            name,
            `mode<>${mode} OR (${sql}) IS NOT DISTINCT FROM expected`,
          ]),
        )
        await pg.exec(`CREATE TABLE ${family}_inputs(id int PRIMARY KEY,v ${profile.identity},w ${profile.identity},m ${profile.multirange},a ${profile.subtype},b ${profile.subtype},input_text text);
        CREATE TABLE ${family}_checks(v ${profile.identity},w ${profile.identity},m ${profile.multirange},a ${profile.subtype},b ${profile.subtype},input_text text,mode int,expected text COLLATE "C",${Object.entries(
          definitions,
        )
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
          .join(',')});
        INSERT INTO ${family}_inputs SELECT 0,${profile.identity}(${a},${b}),'empty'::${profile.identity},${profile.multirange}(${profile.identity}(${a},${b})),${a},${b},${profile.identity}(${a},${b})::text;
        INSERT INTO ${family}_inputs VALUES(1,NULL,'empty',NULL,NULL,NULL,NULL);`)
        const catalog = await snapshotCatalog(pg),
          table = catalog.tables.find((t) => t.name === family + '_checks')!
        const plans = Object.entries(definitions).flatMap(([name, sql]) => {
          const c = table.constraints.find((c) => c.name === name)!
          return (['source', 'stored'] as const).map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: family,
              constraint: name + '_' + origin,
            },
            expression: lowerTableCheck(
              table,
              c,
              [],
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${sql})` : undefined,
            )!.expression,
          }))
        })
        const group = prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          arrayNulls: true,
        })
        expect(
          group.checks.flatMap((c, i) =>
            c.kind === 'unsupported'
              ? [{ name: plans[i]!.identity.constraint, reason: c.reason }]
              : [],
          ),
        ).toEqual([])
        const fixtures: { name: string; row: Row; expected: Outcome }[] = []
        for (const id of [0, 1]) {
          const select = `SELECT * FROM ${family}_inputs WHERE id=${id}`,
            row: Row = {
              v: known(await readRangeFixture(pg, select, 'v', type)),
              w: known(await readRangeFixture(pg, select, 'w', type)),
              m: known(await readMultirangeQueryFixture(pg, profile.multirangeType, select, 'm')),
              input_text: known(
                (
                  await pg.query<{ value: string | null }>(
                    `SELECT input_text value FROM (${select}) r`,
                  )
                ).rows[0]!.value,
              ),
            }
          for (const name of ['a', 'b']) {
            const text = (
              await pg.query<{ value: string | null }>(
                `SELECT ${rangeBoundProjection(name, profile.elementType)} value FROM (${select}) r`,
              )
            ).rows[0]!.value
            const cell = await readRangeBoundCell(pg, profile.elementType, text, profile.subtype)
            if (cell.kind === 'Null') row[name] = known(null)
            else if ('value' in cell)
              row[name] = known(cell.value as Extract<Input, { kind: 'Value' }>['value'])
            else throw Error('Native bound fixture is not a known SQL value')
          }
          for (const [mode, [name, sql]] of Object.entries(operations).entries()) {
            const result = (
              await pg.query<{ value: string | null }>(`SELECT ${sql} value FROM (${select}) r`)
            ).rows[0]!.value
            await pg.query(
              `INSERT INTO ${family}_checks SELECT v,w,m,a,b,input_text,$2,$3 FROM ${family}_inputs WHERE id=$1`,
              [id, mode, result],
            )
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, mode: known(mode), expected: known(result) },
                expected: { kind: 'True' },
              })
            if (result !== null) {
              await expect(
                pg.query(
                  `INSERT INTO ${family}_checks SELECT v,w,m,a,b,input_text,$2,$3 FROM ${family}_inputs WHERE id=$1`,
                  [id, mode, 'different'],
                ),
              ).rejects.toMatchObject({ code: '23514', constraint: name })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: name + '_' + origin,
                  row: { ...row, mode: known(mode), expected: known('different') },
                  expected: { kind: 'False' },
                })
            }
          }
        }
        const directory = join(root, family)
        await mkdir(directory)
        await mkdir('artifacts/goal-checks/catalog-vector-ranges-active', { recursive: true })
        await writeFile(
          `artifacts/goal-checks/catalog-vector-ranges-active/recursive-${family}.json`,
          JSON.stringify(
            {
              fixtures: fixtures.length,
              nativeInserts: fixtures.length / 2,
              unknown: fixtures.filter((f) => f.expected.kind === 'Unknown').length,
            },
            null,
            2,
          ) + '\n',
        )
        await writeFile(
          `artifacts/goal-checks/catalog-vector-ranges-active/recursive-${family}-evaluators.rs`,
          group.evaluatorSource ?? '',
        )
        await runCheckParity(
          directory,
          'vector' + family.replaceAll('_', ''),
          group,
          plans.map((p) => p.identity.constraint),
          fixtures,
        )
        console.info('Recursive vector range parity', {
          family,
          fixtures: fixtures.length,
          nativeInserts: fixtures.length / 2,
        })
      }
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  900_000,
)
