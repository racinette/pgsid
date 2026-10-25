import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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
const packet = 'artifacts/goal-checks/tsquery-comparison-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('compares tsquery trees with signed legacy CRC ordering, containment and lazy source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-scalar-'))
  try {
    await pg.exec("CREATE DOMAIN compared_query AS tsquery CHECK(VALUE<>'forbidden'::tsquery)")
    const definitions: Record<string, string> = {
      eq: 'source::tsquery=other::tsquery',
      ne: 'source::tsquery<>other::tsquery',
      lt: 'source::tsquery<other::tsquery',
      le: 'source::tsquery<=other::tsquery',
      gt: 'source::tsquery>other::tsquery',
      ge: 'source::tsquery>=other::tsquery',
      cmp: 'tsquery_cmp(source::tsquery,other::tsquery)=expected_number',
      contains: 'source::tsquery @> other::tsquery',
      contained: 'source::tsquery <@ other::tsquery',
      distinctness: '(source::tsquery IS DISTINCT FROM other::tsquery)=expected_boolean',
      nulled: 'NULLIF(source::tsquery,other::tsquery) IS NULL',
      selected:
        '(CASE WHEN choose_first THEN source::tsquery ELSE other::tsquery END)=other::tsquery',
      coalesced: 'COALESCE(source::tsquery,other::tsquery)=other::tsquery',
      domain: 'source::compared_query=other::tsquery',
    }
    const columns =
      'source text,other text,expected_number integer,expected_boolean bool,choose_first bool,bypass bool'
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(
        `CREATE TABLE query_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(`CREATE TEMP TABLE query_input(${columns})`)
    const catalog = await snapshotCatalog(pg)
    const checks = Object.entries(definitions).flatMap(([name, sql]) => {
      const table = catalog.tables.find((t) => t.name === 'query_' + name)!,
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
      clientEncoding: 'UTF8',
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const basicPairs: [string | null, string | null][] = [
      [null, 'a'],
      ['', 'a'],
      ['', ''],
      ['a', 'a'],
      ['a:A', 'a:*B'],
      ['a', 'b'],
      ['a', 'z'],
      ['é', 'ê'],
      ['é', 'a'],
      ['😀', 'é'],
      ['a & b', 'a | b'],
      ['a & b', 'b & a'],
      ['a & (b & c)', '(a & b) & c'],
      ['!a', 'aa'],
      ['a', '!a'],
      ['a <2> b', 'a <1> b'],
      ['a <100> b', 'z <0> a'],
      ['!a & b', 'a | !b'],
      ['a:* | a:A', 'a & b'],
      ['a:*', 'abc'],
      ['a & !b', 'b'],
      ['fGEtsNKMDB', '6P7Sag1hsi'],
      ['forbidden', 'a'],
      ['a &', 'b'],
    ]
    const pairs = basicPairs.flatMap(
      ([a, b]) =>
        [
          [a, b],
          [b, a],
        ] as [string | null, string | null][],
    )
    let inserts = 0,
      rejected = 0
    for (let i = 0; i < pairs.length; i++)
      for (const bypass of [false, true]) {
        const [source, other] = pairs[i]!,
          choose = i % 2 === 0,
          expectedBoolean = i % 3 === 0
        let expectedNumber = 0
        try {
          expectedNumber =
            (
              await pg.query<{ value: number }>(
                'SELECT tsquery_cmp($1::tsquery,$2::tsquery) value',
                [source, other],
              )
            ).rows[0]!.value ?? 0
        } catch {}
        if (i % 2) expectedNumber++
        await pg.query('DELETE FROM query_input')
        await pg.query('INSERT INTO query_input VALUES($1,$2,$3,$4,$5,$6)', [
          source,
          other,
          expectedNumber,
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
                `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM query_input`,
              )
            ).rows[0]!.value
          } catch (e) {
            state = (e as { code: string }).code
          }
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO query_${name} SELECT * FROM query_input`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
          inserts++
          if (failure) rejected++
          const collision =
            name === 'cmp' &&
            !bypass &&
            ((source === 'fGEtsNKMDB' && other === '6P7Sag1hsi') ||
              (source === '6P7Sag1hsi' && other === 'fGEtsNKMDB'))
          const expected: Outcome = collision
            ? { kind: 'Unknown' }
            : state
              ? error(state)
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          const row: Row = {
            source: known(source),
            other: known(other),
            expected_number: known(expectedNumber),
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
      'tsqueryscalar',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `tsquery comparisons: ${inserts} native INSERTs, ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
