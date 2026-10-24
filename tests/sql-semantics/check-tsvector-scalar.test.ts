import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseSql } from '../../src/ast.js'
import { planCheckInputs } from '../../src/codegen/shared/check-inputs.js'
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
const packet = 'artifacts/goal-checks/tsvector-scalar-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('binds tsvector scalar text I/O, domains, type-name calls and lazy composition with raw and stored native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-scalar-'))
  try {
    await pg.exec(
      'CREATE DOMAIN imported_vector AS tsvector; CREATE DOMAIN nested_vector AS imported_vector',
    )
    const definitions: Record<string, string> = {
      rendered: 'source::tsvector::text=expected_text',
      varying: '(source::varchar)::tsvector::text=expected_text',
      padded: '(source::bpchar)::tsvector::text=expected_text',
      constructor: 'pg_catalog.tsvector(source)::text=expected_text',
      padded_constructor: 'pg_catalog.tsvector(source::bpchar)::text=expected_text',
      domain: '(source::nested_vector)::text=expected_text',
      selected:
        '(CASE WHEN choose_first THEN source::tsvector ELSE other::tsvector END)::text=expected_text',
      coalesced: 'COALESCE(source::tsvector,other::tsvector)::text=expected_text',
      distinctness: '(source::tsvector IS DISTINCT FROM other::tsvector)=expected_boolean',
      nulled: 'NULLIF(source::tsvector,other::tsvector) IS NULL',
      compared: 'source::tsvector<other::tsvector',
      literal: "length('a:2B a:1A'::tsvector)=1",
      null_literal: 'NULL::tsvector IS NULL',
    }
    const columns =
      'source text,other text,expected_text text,expected_boolean bool,choose_first bool,bypass bool'
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(
        `CREATE TABLE vector_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(`CREATE TEMP TABLE vector_input(${columns})`)
    const catalog = await snapshotCatalog(pg)
    const checks = Object.entries(definitions).flatMap(([name, sql]) => {
      const table = catalog.tables.find((t) => t.name === 'vector_' + name)!,
        c = table.constraints[0]!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...c, definition: `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` }
              : c,
            [],
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(checks, {
      serverEncoding: 'UTF8',
      defaultCollation: 'C',
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const samples = [
      null,
      '',
      'a',
      'b:2C a:1A',
      'a:2B a:1A',
      "'it''s':1A",
      '😀:2 é:1',
      "'",
      'a:0',
      'a:2147483648',
      'a'.repeat(2047),
    ]
    let inserts = 0,
      rejected = 0
    for (let i = 0; i < samples.length; i++)
      for (const bypass of [false, true])
        for (const choose of [false, true]) {
          const source = samples[i]!,
            other = i % 3 === 0 ? null : i % 3 === 1 ? 'a:1' : 'zz',
            expectedText = i % 2 === 0 ? null : "'a'",
            expectedBoolean = i % 2 === 0
          await pg.query('DELETE FROM vector_input')
          await pg.query('INSERT INTO vector_input VALUES($1,$2,$3,$4,$5,$6)', [
            source,
            other,
            expectedText,
            expectedBoolean,
            choose,
            bypass,
          ])
          for (const [name, sql] of Object.entries(definitions)) {
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM vector_input`,
                )
              ).rows[0]!.value
            } catch (e) {
              state = (e as { code: string }).code
            }
            let failure: string | undefined
            try {
              await pg.query(`INSERT INTO vector_${name} SELECT * FROM vector_input`)
            } catch (e) {
              failure = (e as { code: string }).code
            }
            expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
            inserts++
            if (failure) rejected++
            const overflow =
              source === 'a:2147483648' &&
              !bypass &&
              name !== 'literal' &&
              name !== 'null_literal' &&
              !(name === 'selected' && !choose)
            const expected: Outcome = overflow
              ? { kind: 'Unknown' }
              : state
                ? error(state)
                : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            const row: Row = {
              source: known(source),
              other: known(other),
              expected_text: known(expectedText),
              expected_boolean: known(expectedBoolean),
              choose_first: known(choose),
              bypass: known(bypass),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({
              source: source?.length && source.length > 100 ? { length: source.length } : source,
              other,
              name,
              bypass,
              choose,
              value,
              state,
              expected,
            })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'scalar-reference.json'),
      JSON.stringify({ inserts, rejected, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'tsvectorscalar',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(`tsvector scalar: ${inserts} native INSERTs, ${fixtures.length} parity fixtures`)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('keeps raw tsvector and domain query parameters on database coercion', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE DOMAIN imported_vector AS tsvector;CREATE DOMAIN nested_vector AS imported_vector;CREATE TABLE raw_vectors(item tsvector,domain_item nested_vector,CONSTRAINT limit_terms CHECK(length(item)<=2))',
    )
    const catalog = await snapshotCatalog(pg)
    for (const [column, type] of [
      ['item', 'tsvector'],
      ['domain_item', 'public.nested_vector'],
    ] as const) {
      const statement = (await parseSql(`INSERT INTO public.raw_vectors(${column}) VALUES($1)`))
        .stmts![0]!.stmt!
      const writes = [
        {
          target: { schema: 'public', relation: 'raw_vectors', column },
          source: 'insert' as const,
          partial: false,
          value: { kind: 'parameter' as const, number: 1, resolvedType: type },
        },
      ]
      expect(planCheckInputs(statement, writes, catalog, [type])).toEqual([])
    }
    await pg.query('INSERT INTO raw_vectors(item,domain_item) VALUES($1,$2)', ['b a', 'a:1A'])
    await expect(
      pg.query('INSERT INTO raw_vectors(item) VALUES($1)', ['a b c']),
    ).rejects.toMatchObject({ code: '23514' })
    await expect(
      pg.query('INSERT INTO raw_vectors(item) VALUES($1)', ['a:0']),
    ).rejects.toMatchObject({ code: '42601' })
  } finally {
    await pg.close()
  }
})
