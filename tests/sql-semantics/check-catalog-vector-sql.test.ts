import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { decodeCatalogVector } from './check-catalog-vector-fixtures.js'

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failed = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const uncertain = (node: unknown): boolean =>
  !!node &&
  typeof node === 'object' &&
  (('kind' in node && node.kind === 'uncertain') || Object.values(node).some(uncertain))

it('retains direct and array vector JSON conversions through the public portability filter', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE vector_json(v int2vector,o oidvector,
      CONSTRAINT raw_json CHECK(to_json(v)::text='[1,2]'),
      CONSTRAINT normalized_json CHECK(to_jsonb(o)::text='["1", "2"]'),
      CONSTRAINT nested_json CHECK(to_jsonb(ARRAY[v])::text='[[1, 2]]'))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!
    await pg.exec("INSERT INTO vector_json VALUES('1 2','1 2')")
    for (const c of table.constraints) {
      const expression = portableCheckAtoms(lowerTableCheck(table, c)!.expression)
      expect(uncertain(expression), c.name).toBe(false)
      expect(
        prepareCheckRustGroup(
          [
            {
              expression,
              identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
            },
          ],
          { defaultCollation: 'C', serverEncoding: 'UTF8' },
        ).checks[0]!.kind,
      ).toBe('supported')
    }
  } finally {
    await pg.close()
  }
})

it('admits nominal vectors through catalog binding, raw/stored constructors, generic arrays and composed native INSERT parity in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-catalog-vector-sql-'))
  try {
    for (const oid of [false, true]) {
      const type = oid ? 'oidvector' : 'int2vector',
        element = oid ? 'oid' : 'smallint',
        family = oid ? 'oid' : 'int2'
      const calls = new Map<string, { sql: string; kind: 'text' | 'int' | 'bool'; pair?: true }>([
        ['count', { sql: 'cardinality(v)', kind: 'int' }],
        ['rank', { sql: 'array_ndims(v)', kind: 'int' }],
        ['dims', { sql: 'array_dims(v)', kind: 'text' }],
        ['lower', { sql: 'array_lower(v,1)', kind: 'int' }],
        ['upper', { sql: 'array_upper(v,1)', kind: 'int' }],
        ['text', { sql: 'v::text', kind: 'text' }],
        ['bounded_text', { sql: 'v::varchar(3)::text', kind: 'text' }],
        ['equal', { sql: 'v=w', kind: 'bool', pair: true }],
        ['less', { sql: 'v<w', kind: 'bool', pair: true }],
        ['distinct', { sql: 'v IS DISTINCT FROM w', kind: 'bool', pair: true }],
        ['array_equal', { sql: 'array_eq(v,w)', kind: 'bool', pair: true }],
        ['array_less', { sql: 'array_lt(v,w)', kind: 'bool', pair: true }],
        ['coalesce', { sql: 'COALESCE(v,w)::text', kind: 'text', pair: true }],
        ['nullif', { sql: 'NULLIF(v,w)::text', kind: 'text', pair: true }],
        ['greatest', { sql: 'GREATEST(v,w)::text', kind: 'text', pair: true }],
        ['contains', { sql: 'v @> w', kind: 'bool', pair: true }],
        ['overlap', { sql: 'v && w', kind: 'bool', pair: true }],
        ['cat', { sql: 'array_cat(v,w)::text', kind: 'text', pair: true }],
        ['append', { sql: `array_append(v,3::${element})::text`, kind: 'text' }],
        ['prepend', { sql: `array_prepend(3::${element},v)::text`, kind: 'text' }],
        ['remove', { sql: `array_remove(v,2::${element})::text`, kind: 'text' }],
        ['replace', { sql: `array_replace(v,2::${element},3::${element})::text`, kind: 'text' }],
        ['position', { sql: `array_position(v,2::${element})`, kind: 'int' }],
        ['positions', { sql: `array_positions(v,2::${element})::text`, kind: 'text' }],
        ['reverse', { sql: 'array_reverse(v)::text', kind: 'text' }],
        ['sort', { sql: 'array_sort(v)::text', kind: 'text' }],
        ['trim', { sql: 'trim_array(v,0)::text', kind: 'text' }],
        ['slice', { sql: 'v[:]::text', kind: 'text' }],
        ['fetch', { sql: `v[0]::bigint::text`, kind: 'text' }],
        ['any', { sql: `2::${element}=ANY(v)`, kind: 'bool' }],
        ['all', { sql: `2::${element}<ALL(v)`, kind: 'bool' }],
        ['base_array', { sql: `v::${element}[]::text`, kind: 'text' }],
        ['mapped_array', { sql: 'v::bigint[]::text', kind: 'text' }],
        ['json', { sql: 'to_json(v)::text', kind: 'text' }],
        ['jsonb', { sql: 'to_jsonb(v)::text', kind: 'text' }],
        ['nested_text', { sql: 'ARRAY[v,w]::text', kind: 'text', pair: true }],
        ['nested_jsonb', { sql: 'to_jsonb(ARRAY[v,w])::text', kind: 'text', pair: true }],
        ['nested_equal', { sql: 'ARRAY[v]=ARRAY[w]', kind: 'bool', pair: true }],
        ['nested_position', { sql: 'array_position(ARRAY[v,w],v)', kind: 'int', pair: true }],
        ['wire_size', { sql: `octet_length(${type}send(v))`, kind: 'int' }],
        ['hash', { sql: oid ? 'hashoidvector(v)' : 'hash_array(v)', kind: 'int' }],
        [
          'extended_hash',
          {
            sql: oid ? 'hashoidvectorextended(v,-19)::text' : 'hash_array_extended(v,-19)::text',
            kind: 'text',
          },
        ],
        ['nested_hash', { sql: 'hash_array(ARRAY[v,w])', kind: 'int', pair: true }],
        ['literal', { sql: `v='1 2'::${type}`, kind: 'bool' }],
        ['constructed', { sql: `v=ARRAY[1,2]::${type}`, kind: 'bool' }],
        ['empty_constructed', { sql: `cardinality(ARRAY[]::${type})`, kind: 'int' }],
        [
          'wide_constructed',
          { sql: `cardinality(ARRAY[ARRAY[1,2],ARRAY[3,4]]::${type})`, kind: 'int' },
        ],
        ['input', { sql: `(input::${type})::text`, kind: 'text' }],
        ['array_input', { sql: `(array_input::${type}[])::text`, kind: 'text' }],
      ])
      const expressions = Object.fromEntries(
        [...calls].map(([name, call], i) => [
          name,
          `mode<>${i} OR (${call.sql})=${call.kind === 'text' ? 'expected_text' : call.kind === 'int' ? 'expected_int' : 'expected_bool'}`,
        ]),
      )
      await pg.exec(`CREATE TABLE ${family}_vector_checks(v ${type},w ${type},input text,array_input text,mode integer,expected_text text,expected_int integer,expected_bool boolean,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
          .join(',')});
        CREATE TABLE ${family}_vector_inputs(id integer PRIMARY KEY,value ${type});`)
      const specimens = [
        `NULL::${type}`,
        `''::${type}`,
        `'1 2'::${type}`,
        `'1 1'::${type}`,
        `'100'::${type}`,
        oid ? `'4294967295 0 2147483648'::${type}` : `'-32768 0 32767'::${type}`,
        `ARRAY[]::${type}`,
        `ARRAY[1,2]::${type}`,
        `ARRAY[NULL::${element}]::${type}`,
        `ARRAY[ARRAY[1,2],ARRAY[3,4]]::${type}`,
      ]
      const inputs: Input[] = []
      for (const [id, sql] of specimens.entries()) {
        await pg.query(`INSERT INTO ${family}_vector_inputs VALUES($1,${sql})`, [id])
        const { wire } = (
          await pg.query<{ wire: string | null }>(
            `SELECT encode(${type}send(value),'hex') wire FROM ${family}_vector_inputs WHERE id=$1`,
            [id],
          )
        ).rows[0]!
        inputs.push(decodeCatalogVector(wire, oid))
      }
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === `${family}_vector_checks`)!
      const plans = Object.entries(expressions).flatMap(([name, sql]) => {
        const c = table.constraints.find((c) => c.name === name)!
        return ['raw', 'stored'].map((origin) => {
          const expression = lowerTableCheck(
            table,
            origin === 'raw' ? { ...c, definition: `CHECK(${sql})` } : c,
            [],
            catalog.domains,
            origin === 'raw' ? 'source' : 'stored',
          )!.expression
          expect(uncertain(expression), `${type} ${name} ${origin}`).toBe(false)
          return {
            expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + origin,
            },
          }
        })
      })
      const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
      expect(
        group.checks.flatMap((check, i) =>
          check.kind === 'unsupported'
            ? [{ name: plans[i]!.identity.constraint, reason: check.reason }]
            : [],
        ),
      ).toEqual([])
      const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
        references: unknown[] = []
      let nativeInserts = 0
      for (const [mode, [name, call]] of [...calls].entries())
        for (const i of specimens.keys())
          for (const j of call.pair ? specimens.keys() : [2]) {
            const text = i % 3 === 0 ? '' : i % 3 === 1 ? '1 2' : '3 4',
              arrayText = i % 2 === 0 ? '{}' : '{"1 2",NULL,""}'
            let result: string | number | boolean | null = null,
              expected: Outcome
            try {
              result = (
                await pg.query<{ value: string | number | boolean | null }>(
                  `SELECT ${call.sql} value FROM (SELECT a.value v,b.value w,$3::text input,$4::text array_input FROM ${family}_vector_inputs a,${family}_vector_inputs b WHERE a.id=$1 AND b.id=$2) q`,
                  [i, j, text, arrayText],
                )
              ).rows[0]!.value
              expected = { kind: result === null ? 'Null' : 'True' }
            } catch (error) {
              expected = failed((error as { code: string }).code)
            }
            const values = [
              call.kind === 'text' ? result : null,
              call.kind === 'int' ? result : null,
              call.kind === 'bool' ? result : null,
            ]
            const row: Row = {
              v: inputs[i]!,
              w: inputs[j]!,
              mode: known(mode),
              input: known(text),
              array_input: known(arrayText),
              expected_text: known(values[0]!),
              expected_int: known(values[1]!),
              expected_bool: known(values[2]!),
            }
            for (const origin of ['raw', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            const insert = pg.query(
              `INSERT INTO ${family}_vector_checks(v,w,input,array_input,mode,expected_text,expected_int,expected_bool) VALUES(${specimens[i]},${specimens[j]},$1,$2,$3,$4,$5,$6)`,
              [text, arrayText, mode, ...values],
            )
            if (expected.kind === 'Error')
              await expect(insert).rejects.toMatchObject({
                code: expected.value.state.toString(36).toUpperCase().padStart(5, '0'),
              })
            else await insert
            nativeInserts++
            references.push({ name, i, j, result, expected })
            if (i === 2 && j === 2 && result !== null && expected.kind === 'True') {
              const wrong =
                call.kind === 'bool'
                  ? !result
                  : call.kind === 'text'
                    ? '__different__'
                    : result === 2147483647
                      ? -2147483648
                      : Number(result) + 1
              const changed = [
                call.kind === 'text' ? wrong : null,
                call.kind === 'int' ? wrong : null,
                call.kind === 'bool' ? wrong : null,
              ]
              for (const origin of ['raw', 'stored'])
                fixtures.push({
                  name: name + '_' + origin,
                  row: {
                    ...row,
                    expected_text: known(changed[0]!),
                    expected_int: known(changed[1]!),
                    expected_bool: known(changed[2]!),
                  },
                  expected: { kind: 'False' },
                })
              await expect(
                pg.query(
                  `INSERT INTO ${family}_vector_checks(v,w,input,array_input,mode,expected_text,expected_int,expected_bool) VALUES(${specimens[i]},${specimens[j]},$1,$2,$3,$4,$5,$6)`,
                  [text, arrayText, mode, ...changed],
                ),
              ).rejects.toMatchObject({ code: '23514' })
              nativeInserts++
            }
          }
      const directory = join(root, family)
      await mkdir(directory)
      await mkdir('artifacts/catalog-vector-sql', { recursive: true })
      await writeFile(
        `artifacts/catalog-vector-sql/${family}.json`,
        JSON.stringify({ nativeInserts, fixtures: fixtures.length, references }, null, 2) + '\n',
      )
      await writeFile(
        `artifacts/catalog-vector-sql/${family}-evaluators.rs`,
        group.evaluatorSource ?? '',
      )
      await runCheckParity(
        directory,
        family + 'vectorsql',
        group,
        plans.map((p) => p.identity.constraint),
        fixtures,
      )
      console.info('Vector SQL parity', {
        type,
        nativeInserts,
        fixtures: fixtures.length,
        checks: calls.size,
      })
    }
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
