import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import {
  domainCheckLiterals,
  tableCheckCases,
  type CheckColumnCase,
  type TableCheckCases,
} from '../../../src/query/check-cases.js'
import type { CheckCaseCatalog } from '../../../src/query/types.js'

const DDL = `
  CREATE TYPE pay_kind AS ENUM ('paid', 'pending', 'refunded');
  CREATE TABLE statuses (status text NOT NULL CHECK (status IN ('a', 'b')), note varchar(10) CHECK (note IN ('x', 'y')));
  CREATE TABLE payments (kind pay_kind NOT NULL, paid_at date, CHECK ((kind = 'paid') = (paid_at IS NOT NULL)));
  CREATE TABLE members (kind pay_kind NOT NULL, since date,
    CHECK (CASE kind WHEN 'paid' THEN since IS NOT NULL WHEN 'pending' THEN since IS NULL ELSE NULL END));
  CREATE TABLE implied (kind pay_kind, paid_at date, CHECK (kind <> 'paid' OR paid_at IS NOT NULL));
  CREATE TABLE exactly_one (a int, b text, c date, CHECK (num_nonnulls(a, b, c) = 1));
  CREATE TABLE levels (level int CHECK (level IN (1, 2, 3)), big bigint CHECK (big = ANY (ARRAY[1, 2])), wide bigint CHECK (wide IN (-5, 7)),
    signed smallint NOT NULL CHECK (signed IN (-1, 1)));
  CREATE TABLE flags (flag boolean NOT NULL, note text, CHECK (flag OR note IS NULL));
  CREATE TABLE padded (code char(2) CHECK (code IN ('a')));
  CREATE TABLE later (status text);
  CREATE TABLE distinct_from (status text CHECK (status IS DISTINCT FROM 'z'), other text CHECK (other NOT IN ('q')));
  CREATE DOMAIN tier AS text CHECK (VALUE IN ('gold', 'silver'));
  CREATE DOMAIN gold_tier AS tier CHECK (VALUE <> 'silver');
  CREATE DOMAIN unpaid AS pay_kind CHECK (VALUE <> 'paid');
  CREATE DOMAIN step AS smallint NOT NULL CHECK (VALUE IN (-1, 1));
  CREATE TABLE tiered (level tier CHECK (level IN ('gold')));
  CREATE DOMAIN coded AS text;
  CREATE TABLE coded_values (value coded);
  INSERT INTO coded_values VALUES ('y');
  ALTER DOMAIN coded ADD CONSTRAINT one_code CHECK (VALUE IN ('x')) NOT VALID;
  CREATE TABLE opened (kind text NOT NULL, amount int,
    CHECK (CASE WHEN kind = 'card' THEN amount IS NOT NULL ELSE amount IS NULL END));
`

// Candidate values per column; every combination the server accepts must be covered.
const candidates: Record<string, Record<string, readonly (string | number | boolean | null)[]>> = {
  statuses: { status: ['a', 'b', 'c', null], note: ['x', 'y', 'z', null] },
  payments: { kind: ['paid', 'pending', 'refunded'], paid_at: ['2020-01-01', null] },
  members: { kind: ['paid', 'pending', 'refunded'], since: ['2020-01-01', null] },
  implied: { kind: ['paid', 'pending', null], paid_at: ['2020-01-01', null] },
  exactly_one: { a: [1, null], b: ['b', null], c: ['2020-01-01', null] },
  levels: {
    level: [1, 2, 3, 4, null],
    big: [1, 2, 3, null],
    wide: [-5, 5, 7, null],
    signed: [-1, 0, 1],
  },
  flags: { flag: [true, false], note: ['n', null] },
  padded: { code: ['a', 'a ', 'b', null] },
  later: { status: ['a', 'b', null] },
  distinct_from: { status: ['z', 'y', null], other: ['q', 'r', null] },
  opened: { kind: ['card', 'cash', 'x'], amount: [5, null] },
  tiered: { level: ['gold', 'silver', null] },
}

let pg: PGlite
let catalog: CheckCaseCatalog

beforeAll(async () => {
  pg = await PGlite.create()
  await pg.exec(DDL)
  await pg.exec(`INSERT INTO later VALUES ('b')`)
  await pg.exec(`ALTER TABLE later ADD CHECK (status IN ('a')) NOT VALID`)
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
})

afterAll(async () => {
  if (!pg.closed) await pg.close()
})

const covers = (item: CheckColumnCase, value: unknown): boolean =>
  value === null ? item.null : item.values === null || item.values.includes(String(value))

async function accepted(table: string): Promise<Record<string, unknown>[]> {
  const columns = Object.entries(candidates[table]!)
  const rows: Record<string, unknown>[] = [{}]
  for (const [name, values] of columns)
    rows.splice(
      0,
      rows.length,
      ...rows.flatMap((row) => values.map((v) => ({ ...row, [name]: v }))),
    )
  const result: Record<string, unknown>[] = []
  for (const row of rows) {
    await pg.exec('BEGIN')
    try {
      await pg.query(
        `INSERT INTO ${table} (${columns.map(([name]) => name).join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`,
        columns.map(([name]) => row[name]),
      )
      result.push(row)
    } catch {
      // Rejected rows need no covering case.
    } finally {
      await pg.exec('ROLLBACK')
    }
  }
  return result
}

function expectSound(cases: TableCheckCases, rows: readonly Record<string, unknown>[]): void {
  for (const row of rows) {
    for (const [name, column] of cases.columns)
      expect(covers(column.summary, row[name]), `${name} of ${JSON.stringify(row)}`).toBe(true)
    for (const group of cases.groups)
      expect(
        group.cases.some((member) =>
          group.columns.every((name, index) => covers(member[index]!, row[name])),
        ),
        JSON.stringify(row),
      ).toBe(true)
  }
}

const summary = (cases: TableCheckCases) =>
  Object.fromEntries([...cases.columns].map(([name, column]) => [name, column.summary]))
const members = (cases: TableCheckCases) =>
  cases.groups.map((group) =>
    group.cases.map((member) =>
      Object.fromEntries(group.columns.map((name, index) => [name, member[index]])),
    ),
  )

const domainCandidates: Record<string, readonly (string | number | null)[]> = {
  tier: ['gold', 'silver', 'bronze', null],
  gold_tier: ['gold', 'silver', null],
  unpaid: ['paid', 'pending', 'refunded', null],
  step: [-1, 0, 1, null],
}

describe('CHECK case derivation', () => {
  it('reads the literals a domain chain admits, covering every value the server accepts', async () => {
    for (const [domain, values] of Object.entries(domainCandidates)) {
      const literals = domainCheckLiterals(catalog, 'public', domain)
      expect(literals, domain).not.toBeNull()
      for (const value of values) {
        const accepted = await pg.query(`SELECT $1::${domain}`, [value]).then(
          () => true,
          () => false,
        )
        if (accepted && value !== null)
          expect(literals!.values, `${domain} ${value}`).toContain(String(value))
      }
    }
    expect(domainCheckLiterals(catalog, 'public', 'tier')).toEqual({
      kind: 'string',
      values: ['gold', 'silver'],
    })
    expect(domainCheckLiterals(catalog, 'public', 'gold_tier')!.values).toEqual(['gold'])
    expect(domainCheckLiterals(catalog, 'public', 'unpaid')!.values).toEqual([
      'pending',
      'refunded',
    ])
    expect(domainCheckLiterals(catalog, 'public', 'step')).toEqual({
      kind: 'number',
      values: ['-1', '1'],
    })
    // Stored values may predate a NOT VALID constraint: coded_values holds 'y'.
    expect(domainCheckLiterals(catalog, 'public', 'coded')).toBeNull()
  })

  it('covers every row the server accepts, for stored and written readings', async () => {
    for (const table of Object.keys(candidates)) {
      const rows = await accepted(table)
      expect(rows.length, table).toBeGreaterThan(0)
      expectSound(tableCheckCases(catalog, 'public', table, 'written'), rows)
      if (table !== 'later') expectSound(tableCheckCases(catalog, 'public', table, 'stored'), rows)
    }
  })

  it('reads literal sets from IN lists, ANY arrays and negative integers', () => {
    expect(summary(tableCheckCases(catalog, 'public', 'statuses', 'stored'))).toEqual({
      status: { null: false, values: ['a', 'b'] },
      note: { null: true, values: ['x', 'y'] },
    })
    expect(summary(tableCheckCases(catalog, 'public', 'levels', 'stored'))).toEqual({
      level: { null: true, values: ['1', '2', '3'] },
      big: { null: true, values: ['1', '2'] },
      // Stored as ('-5'::integer)::bigint.
      wide: { null: true, values: ['-5', '7'] },
      signed: { null: false, values: ['-1', '1'] },
    })
    // A domain column compares at its base type.
    expect(summary(tableCheckCases(catalog, 'public', 'tiered', 'stored'))).toEqual({
      level: { null: true, values: ['gold'] },
    })
  })

  it('splits rows into cases a discriminant selects', () => {
    const paid = { null: false, values: ['paid'] }
    const date = { null: false, values: null }
    const none = { null: true, values: [] }
    expect(members(tableCheckCases(catalog, 'public', 'payments', 'stored'))).toEqual([
      [
        { kind: paid, paid_at: date },
        { kind: { null: false, values: ['pending', 'refunded'] }, paid_at: none },
      ],
    ])
    // A CASE without a matching branch is NULL, which a CHECK accepts.
    expect(members(tableCheckCases(catalog, 'public', 'members', 'stored'))).toEqual([
      [
        { kind: { null: false, values: ['paid', 'refunded'] }, since: date },
        { kind: { null: false, values: ['pending', 'refunded'] }, since: none },
      ],
    ])
    expect(members(tableCheckCases(catalog, 'public', 'implied', 'stored'))).toEqual([
      [
        // Every label is any value of the enum.
        { kind: { null: true, values: null }, paid_at: date },
        { kind: { null: true, values: ['pending', 'refunded'] }, paid_at: none },
      ],
    ])
    expect(members(tableCheckCases(catalog, 'public', 'exactly_one', 'stored'))).toHaveLength(1)
    expect(members(tableCheckCases(catalog, 'public', 'exactly_one', 'stored'))[0]).toHaveLength(3)
    expect(members(tableCheckCases(catalog, 'public', 'flags', 'stored'))).toEqual([
      [
        { flag: { null: false, values: ['true'] }, note: { null: true, values: null } },
        { flag: { null: false, values: ['false'] }, note: none },
      ],
    ])
    // An open text discriminant keeps its other values, which the card case excludes.
    expect(members(tableCheckCases(catalog, 'public', 'opened', 'stored'))).toEqual([
      [
        { kind: { null: false, values: ['card'] }, amount: date },
        { kind: { null: false, values: null }, amount: none },
      ],
    ])
  })

  it('reads nothing it cannot decide exactly', () => {
    // bpchar compares after stripping trailing blanks: 'a ' passes as 'a'.
    expect(summary(tableCheckCases(catalog, 'public', 'padded', 'stored'))).toEqual({
      code: { null: true, values: null },
    })
    // A NOT VALID CHECK binds writes only: stored rows may predate it.
    expect(summary(tableCheckCases(catalog, 'public', 'later', 'stored'))).toEqual({})
    expect(summary(tableCheckCases(catalog, 'public', 'later', 'written'))).toEqual({
      status: { null: true, values: ['a'] },
    })
    expect(summary(tableCheckCases(catalog, 'public', 'distinct_from', 'stored'))).toEqual({
      status: { null: true, values: null },
      other: { null: true, values: null },
    })
  })
})
