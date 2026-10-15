import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { bindProbe } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { snapshotInputForms } from './check-snapshot-input-forms.js'

it('binds nominal snapshot literals, explicit catalog I/O casts, domains and composition in raw and stored CHECKs', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-snapshot-binding-'))
  const known = (value: string | bigint | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    for (const type of ['pg_snapshot', 'txid_snapshot'] as const) {
      await pg.exec(
        `CREATE DOMAIN ${type}_domain AS ${type};CREATE DOMAIN ${type}_nested AS ${type}_domain`,
      )
      const idType = type === 'pg_snapshot' ? 'xid8' : 'bigint'
      const expressions: Record<string, string> = {
        output: `source::${type}_nested::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`,
        constructor: `pg_catalog.${type}(source)::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`,
        identity_constructor: `pg_catalog.${type}(source::${type})::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`,
        text_constructor: `pg_catalog.text(source::${type}) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`,
        varchar_constructor: `pg_catalog.varchar(source::${type})::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`,
        bpchar_constructor: `pg_catalog.bpchar(source::${type})::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`,
        name_input: `identifier::${type}::text COLLATE "C" IS NOT DISTINCT FROM expected_identifier COLLATE "C"`,
        name_constructor: `pg_catalog.${type}(identifier)::text COLLATE "C" IS NOT DISTINCT FROM expected_identifier COLLATE "C"`,
        padded_input: `bypass OR padded::${type}::text COLLATE "C"=expected_text COLLATE "C"`,
        padded_constructor: `bypass OR pg_catalog.${type}(padded)::text COLLATE "C"=expected_text COLLATE "C"`,
        name_output: `(source::${type})::name IS NOT NULL`,
        name_output_constructor: `pg_catalog.name(source::${type}) IS NOT NULL`,
        null_name_output: `(NULL::${type})::name IS NULL`,
        wire: `${type}_send(source::${type}) IS NOT DISTINCT FROM wire`,
        xmin: `${type}_xmin(source::${type}) IS NOT DISTINCT FROM expected_xmin`,
        xmax: `${type}_xmax(source::${type}) IS NOT DISTINCT FROM expected_xmax`,
        short: `source::${type}::varchar(3)::text COLLATE "C" IS NOT DISTINCT FROM expected_short COLLATE "C"`,
        coalesced: `COALESCE(NULL::${type},source::${type},'1:9:'::${type})::text COLLATE "C" IS NOT DISTINCT FROM expected_selected COLLATE "C"`,
        selected: `(CASE WHEN choose_source THEN source::${type} ELSE '1:9:'::${type} END)::text COLLATE "C" IS NOT DISTINCT FROM expected_selected COLLATE "C"`,
        unknown_literal: `COALESCE(NULL::${type},'1:9:')::text COLLATE "C" = '1:9:' COLLATE "C"`,
        null_literal: `NULL::${type} IS NULL`,
        skipped: `bypass OR ${type}_xmin(source::${type}) > '0'::${idType}`,
      }
      await pg.exec(
        `CREATE TABLE ${type}_checks(source text,identifier name,expected_identifier text,padded char(8), wire bytea, expected_text text, expected_short text, expected_selected text,expected_xmin ${idType},expected_xmax ${idType},choose_source boolean,bypass boolean,${Object.entries(
          expressions,
        )
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
          .join(',')})`,
      )
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === type + '_checks')!
      const checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const stored = table.constraints.find((c) => c.name === name)!
        return [
          { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
          { ...stored, name: name + '_stored' },
        ].map((c) => ({
          expression: portableCheckAtoms(
            lowerTableCheck(table, c, [], catalog.domains)!.expression,
          ),
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: c.name,
          },
        }))
      })
      const group = prepareCheckRustGroup(checks)
      for (const [i, c] of group.checks.entries())
        expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ':' + c.reason : '')).toBe(
          'supported',
        )
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const add = (name: string, row: Row, expected: Outcome) => {
        for (const suffix of ['_raw', '_stored'])
          fixtures.push({ name: name + suffix, row, expected })
      }
      let base: Row | undefined
      for (const source of [...snapshotInputForms, null]) {
        const data = (
          await pg.query<{
            normalized: string | null
            short: string | null
            xmin: string | null
            xmax: string | null
            wire: string | null
          }>(
            `SELECT s::text AS normalized,s::varchar(3)::text AS short,${type}_xmin(s)::text AS xmin,${type}_xmax(s)::text AS xmax,encode(${type}_send(s),'hex') AS wire FROM (SELECT $1::${type} AS s) q`,
            [source],
          )
        ).rows[0]!
        const row: Row = {
          source: known(source),
          identifier: known('1:9:'),
          expected_identifier: known('1:9:'),
          padded: known('1:9:    '),
          wire: known(data.wire),
          expected_text: known(data.normalized),
          expected_short: known(data.short),
          expected_selected: known(data.normalized ?? '1:9:'),
          expected_xmin: known(data.xmin === null ? null : BigInt.asIntN(64, BigInt(data.xmin))),
          expected_xmax: known(data.xmax === null ? null : BigInt.asIntN(64, BigInt(data.xmax))),
          choose_source: known(source !== null),
          bypass: known(true),
        }
        for (const name of Object.keys(expressions))
          add(name, row, {
            kind:
              name === 'name_output' || name === 'name_output_constructor'
                ? source === null
                  ? 'False'
                  : 'Unknown'
                : 'True',
          })
        if (source === '1:9:') base = row
      }
      const row = base!
      for (const name of ['name_input', 'name_constructor']) {
        add(
          name,
          { ...row, identifier: known(null), expected_identifier: known(null) },
          { kind: 'True' },
        )
        add(
          name,
          { ...row, identifier: known('invalid') },
          { kind: 'Error', value: { state: parseInt('22P02', 36) } },
        )
      }
      for (const name of ['padded_input', 'padded_constructor']) {
        await expect(pg.query(`SELECT ${type}($1::char(8))`, ['1:9:'])).rejects.toMatchObject({
          code: '22P02',
        })
        expect(
          (
            await pg.query<{ value: string }>(`SELECT ${type}($1::char(8))::text AS value`, [
              '1:10:3,5',
            ])
          ).rows[0]!.value,
        ).toBe('1:10:3,5')
        add(
          name,
          { ...row, bypass: known(false) },
          { kind: 'Error', value: { state: parseInt('22P02', 36) } },
        )
        add(
          name,
          {
            ...row,
            bypass: known(false),
            padded: known('1:10:3,5'),
            expected_text: known('1:10:3,5'),
          },
          { kind: 'True' },
        )
        add(name, { ...row, bypass: known(false), padded: known(null) }, { kind: 'Null' })
      }
      add('output', { ...row, expected_text: known('different') }, { kind: 'False' })
      add(
        'selected',
        {
          ...row,
          source: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          choose_source: known(false),
        },
        { kind: 'True' },
      )
      add('skipped', { ...row, source: known('invalid'), bypass: known(true) }, { kind: 'True' })
      add(
        'skipped',
        { ...row, source: known('invalid'), bypass: known(false) },
        { kind: 'Error', value: { state: parseInt('22P02', 36) } },
      )
      add('output', { ...row, source: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(
        'output',
        { ...row, source: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
        { kind: 'Error', value: { state: parseInt('22003', 36) } },
      )
      const target = join(directory, type)
      await mkdir(target)
      await runCheckParity(
        target,
        'snapshot_binding_' + type,
        group,
        checks.map((c) => c.identity.constraint),
        fixtures,
      )
    }
    for (const expression of ['s=t', 's<t', 's::txid_snapshot IS NOT NULL']) {
      expect(
        bindProbe(expression, [
          { name: 's', typeName: 'pg_snapshot' },
          { name: 't', typeName: 'pg_snapshot' },
        ]).fullyBound,
        expression,
      ).toBe(false)
    }
    for (const expression of [
      'pg_current_snapshot() IS NOT NULL',
      'txid_current_snapshot() IS NOT NULL',
    ]) {
      const probe = bindProbe(expression, [])
      expect(probe.fullyBound, expression).toBe(true)
      expect(probe.preparation.kind, expression).toBe('unsupported')
    }
    await expect(pg.query("SELECT '1:9:'::pg_snapshot='1:9:'::pg_snapshot")).rejects.toMatchObject({
      code: '42883',
    })
    await expect(pg.query("SELECT '1:9:'::pg_snapshot::txid_snapshot")).rejects.toMatchObject({
      code: '42846',
    })
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 480000)
