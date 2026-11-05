import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
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

// nameconcatoid is computed under the declared identifier limit; the others answer from
// deployment state, so only their NULL and error arguments are decided.
const expressions: Record<string, string> = {
  concatenated: 'nameconcatoid(label, number) = recorded',
  image: 'btequalimage(number)',
  varstr_image: 'btvarstrequalimage(number)',
  walfile: "pg_walfile_name(lsn) = 'x'",
  phase: "pg_indexam_progress_phasename(number, 1) = 'x'",
  root: 'pg_partition_root(relation) IS NULL',
  validator: 'postgresql_fdw_validator(options, number)',
}

it('computes name suffixes under the identifier limit and leaves catalog-bound answers to the deployment', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-internal-callables-'))
  try {
    await pg.exec(`CREATE TABLE internals (label name, number oid, recorded name, lsn pg_lsn,
      relation regclass, options text[],
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((x) => x.name === 'internals')!
    const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const [name, sql] of Object.entries(expressions))
      for (const form of ['raw', 'stored']) {
        const plan = lowerTableCheck(
          table,
          form === 'raw'
            ? { name, type: 'check', definition: `CHECK (${sql})` }
            : table.constraints.find((check) => check.name === name)!,
        )!
        checks.push({
          expression: plan.expression,
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: `${name}_${form}`,
          },
        })
      }
    const group = prepareCheckRustGroup(checks, { maxIdentifierBytes: 63, serverEncoding: 'UTF8' })
    for (const check of group.checks)
      expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
    const value = (v: string | number | null): Input =>
      v === null
        ? { kind: 'Null' }
        : { kind: 'Value', value: typeof v === 'number' ? BigInt(v) : v }
    const base: Row = {
      label: value('t'),
      number: value(1),
      recorded: value('t_1'),
      lsn: value(23869256),
      relation: value(1259),
      options: { kind: 'Unknown' },
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: `${name}_${form}`, row, expected })
    }
    // Long ASCII and multibyte names are clipped at a character boundary before the suffix.
    for (const label of [
      't',
      '',
      'a'.repeat(63),
      'é'.repeat(31) + 'a',
      '😊'.repeat(15) + 'abc',
      'x'.repeat(60),
    ])
      for (const number of [0, 7, 4294967295]) {
        const recorded = (
          await pg.query<{ v: string }>('SELECT nameconcatoid($1::name, $2::oid)::text v', [
            label,
            number,
          ])
        ).rows[0]!.v
        add(
          'concatenated',
          { ...base, label: value(label), number: value(number), recorded: value(recorded) },
          { kind: 'True' },
        )
        add(
          'concatenated',
          { ...base, label: value(label), number: value(number), recorded: value(recorded + 'x') },
          { kind: 'False' },
        )
      }
    add('concatenated', { ...base, label: value(null) }, { kind: 'Null' })
    add('concatenated', { ...base, number: value(null) }, { kind: 'Null' })
    const failed: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const name of ['image', 'varstr_image', 'phase', 'validator']) {
      add(name, { ...base, number: value(null) }, { kind: 'Null' })
      add(name, base, { kind: 'Unknown' })
      add(name, { ...base, number: failed }, failed as Outcome)
    }
    add('validator', { ...base, options: { kind: 'Null' } }, { kind: 'Null' })
    add('walfile', base, { kind: 'Unknown' })
    add('walfile', { ...base, lsn: value(null) }, { kind: 'Null' })
    add('root', base, { kind: 'Unknown' })
    add('root', { ...base, relation: value(null) }, { kind: 'True' })
    await runCheckParity(
      directory,
      'internal_callables',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
