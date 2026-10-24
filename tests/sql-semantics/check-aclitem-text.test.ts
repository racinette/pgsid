import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/aclitem-text-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it.each(['declared', 'width_only', 'absent'])(
  'preserves ACL text grammar errors before catalog lookup with explicit identifier-byte context in every target (%s)',
  async (profileName) => {
    const pg = await PGlite.create(),
      root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-text-'))
    try {
      const maxIdentifierBytes = (
        await pg.query<{ maxIdentifierBytes: number }>(
          await readFile('tools/check-rust/identifier-context.sql', 'utf8'),
        )
      ).rows[0]!.maxIdentifierBytes
      expect(maxIdentifierBytes).toBeGreaterThan(0)
      const expressions: Record<string, string> = {
        cast: 'source::aclitem IS NULL',
        constructor: 'pg_catalog.aclitem(source) IS NULL',
        varying_input: '(source::varchar)::aclitem IS NULL',
        padded_input: '(source::bpchar)::aclitem IS NULL',
        padded_constructor: 'pg_catalog.aclitem(source::bpchar) IS NULL',
        domain_cast: 'source::text_acl IS NULL',
        array_cast: 'cardinality(ARRAY[source]::aclitem[])=1',
        discarded: '(ROW(source,1)::acl_text_record).n=1',
      }
      await pg.exec(
        'CREATE ROLE acl_text_reader;CREATE DOMAIN text_acl AS aclitem;CREATE TYPE acl_text_record AS (item aclitem,n integer)',
      )
      for (const [name, sql] of Object.entries(expressions))
        await pg.exec(
          `CREATE TABLE acl_text_${name}(source text,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
        )
      await pg.exec('CREATE TEMP TABLE acl_text_input(source text,bypass boolean)')
      const catalog = await snapshotCatalog(pg),
        checks = Object.entries(expressions).flatMap(([name, sql]) => {
          const table = catalog.tables.find((t) => t.name === 'acl_text_' + name)!,
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
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
              )!.expression,
            ),
          }))
        })
      const samples: {
        source: string | null
        state?: string
        width?: boolean
        utf8?: boolean
        catalog?: boolean
      }[] = [
        { source: null },
        ...[
          '',
          ' ',
          '\t\n',
          ';',
          '""',
          '=r/',
          '=r/""',
          '=r/;',
          '=z/',
          '=R/',
          '=r!tail',
          '="foo',
        ].map((source) => ({ source, state: '22P02' })),
        ...['word', 'USER foo=r/', '"user" ', '"a""b"', '"unterminated', 'does_not_exist=z/'].map(
          (source) => ({ source, state: '22P02', width: true }),
        ),
        ...[
          'user =r/',
          '=',
          '=*',
          '=r',
          '=r/acl_text_reader',
          'does_not_exist=r/',
          'acl_text_reader=r/',
          '123=r/456',
          'acl_text_reader=r/acl_text_reader',
          '"acl_text_reader"=r/"acl_text_reader"',
        ].map((source) => ({ source, catalog: true })),
        { source: 'a'.repeat(maxIdentifierBytes + 1) + '=z/', state: '42622', width: true },
        { source: '=r/"' + ' '.repeat(maxIdentifierBytes + 1), state: '42622', width: true },
        { source: '=r/' + 'a'.repeat(maxIdentifierBytes + 1), state: '42622', width: true },
        {
          source: 'é'.repeat(Math.floor(maxIdentifierBytes / 2) + 1) + '=z/',
          state: '42622',
          width: true,
          utf8: true,
        },
        {
          source: '=r/' + '😀'.repeat(Math.floor(maxIdentifierBytes / 4) + 1),
          state: '42622',
          width: true,
          utf8: true,
        },
        { source: 'acl_text_reader=r/' + 'a'.repeat(maxIdentifierBytes + 1), catalog: true },
      ]
      const profiles: { name: string; context: CheckExecutionContext }[] = [
        {
          name: 'declared',
          context: {
            maxIdentifierBytes,
            serverEncoding: 'UTF8',
            arrayNulls: true,
            defaultCollation: 'C',
          },
        },
        {
          name: 'width_only',
          context: { maxIdentifierBytes, arrayNulls: true, defaultCollation: 'C' },
        },
        { name: 'absent', context: { arrayNulls: true, defaultCollation: 'C' } },
      ]
      const references: { source: string | null; name: string; outcome: Outcome }[] = []
      let nativeInserts = 0,
        nativeRejections = 0
      for (const sample of samples) {
        await pg.query('DELETE FROM acl_text_input')
        await pg.query('INSERT INTO acl_text_input VALUES($1,false)', [sample.source])
        for (const [name, sql] of Object.entries(expressions)) {
          let outcome: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT (${sql}) AS value FROM acl_text_input`,
              )
            ).rows[0]!.value
            outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (e) {
            outcome = error((e as { code: string }).code)
          }
          if (sample.state && name !== 'discarded')
            expect(outcome, JSON.stringify(sample) + ':' + name).toEqual(error(sample.state))
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO acl_text_${name} SELECT * FROM acl_text_input`)
          } catch (e) {
            failure = (e as { code: string }).code
            nativeRejections++
          }
          expect(failure).toBe(
            outcome.kind === 'False'
              ? '23514'
              : outcome.kind === 'Error'
                ? outcome.value.state.toString(36).toUpperCase().padStart(5, '0')
                : undefined,
          )
          nativeInserts++
          references.push({ source: sample.source, name, outcome })
        }
      }
      await mkdir(packet, { recursive: true })
      await writeFile(
        join(packet, 'grammar-reference.json'),
        JSON.stringify(
          { maxIdentifierBytes, nativeInserts, nativeRejections, references },
          null,
          2,
        ) + '\n',
      )
      for (const profile of profiles.filter((p) => p.name === profileName)) {
        const group = prepareCheckRustGroup(checks, profile.context)
        group.checks.forEach((c, i) =>
          expect(
            c.kind,
            checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : ''),
          ).toBe('supported'),
        )
        const fixtures: { name: string; row: Row; expected: Outcome }[] = []
        for (const sample of samples)
          for (const name of Object.keys(expressions)) {
            const native = references.find(
              (r) => r.source === sample.source && r.name === name,
            )!.outcome
            const expected: Outcome =
              name !== 'discarded' &&
              (sample.catalog ||
                (sample.width && profile.context.maxIdentifierBytes === undefined) ||
                (sample.utf8 && profile.context.serverEncoding !== 'UTF8'))
                ? { kind: 'Unknown' }
                : native
            for (const origin of ['source', 'stored']) {
              const row: Row = { source: known(sample.source), bypass: known(false) }
              fixtures.push({ name: name + '_' + origin, row, expected })
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, bypass: known(true) },
                expected: { kind: 'True' },
              })
            }
          }
        await runCheckParity(
          root,
          'acltext' + profile.name.replaceAll('_', ''),
          group,
          checks.map((c) => c.identity.constraint),
          fixtures,
        )
        console.log(`ACL text ${profile.name}: ${fixtures.length} parity fixtures`)
      }
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  600_000,
)

it('retains ACL text non-NULL facts and strict errors without rendering deployment role names in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-output-'))
  const expressions: Record<string, string> = {
    presence: 'item::text IS NOT NULL',
    varying: 'item::varchar IS NOT NULL',
    padded: 'item::bpchar IS NOT NULL',
    coalesced: 'COALESCE(item::text,(1/zero)::text) IS NOT NULL',
    array: 'ARRAY[item]::text IS NOT NULL',
    record: 'ROW(item,1)::text IS NOT NULL',
    array_late_error: 'ARRAY[item::text,(1/zero)::text]::text IS NOT NULL',
    record_late_error: 'ROW(item::text,(1/zero)::text)::text IS NOT NULL',
    bytes: 'item::text=expected',
    size: 'length(item::text)>0',
  }
  try {
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE acl_output_${name}(item aclitem,zero int,expected text,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(
      'CREATE TEMP TABLE acl_output_input(item aclitem,zero int,expected text,bypass boolean)',
    )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'acl_output_' + name)!,
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
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let nativeInserts = 0
    for (const payload of [
      null,
      { grantee: 0n, grantor: 0n, privileges: 2n, grantOptions: 0n },
      { grantee: 4294967295n, grantor: 4294967294n, privileges: 2n, grantOptions: 2n },
    ])
      for (const zero of [0, 1]) {
        await pg.query('DELETE FROM acl_output_input')
        await pg.query(
          `INSERT INTO acl_output_input SELECT makeaclitem($1::oid,$2::oid,'SELECT',$3::boolean),$4::int,'unavailable role name',false`,
          [
            payload?.grantee.toString() ?? null,
            payload?.grantor.toString() ?? null,
            payload?.grantOptions !== 0n,
            zero,
          ],
        )
        for (const [name, sql] of Object.entries(expressions)) {
          let native: Outcome
          try {
            const v = (
              await pg.query<{ v: boolean | null }>(`SELECT (${sql}) v FROM acl_output_input`)
            ).rows[0]!.v
            native = { kind: v === null ? 'Null' : v ? 'True' : 'False' }
          } catch (e) {
            native = error((e as { code: string }).code)
          }
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO acl_output_${name} SELECT * FROM acl_output_input`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(
            native.kind === 'False'
              ? '23514'
              : native.kind === 'Error'
                ? native.value.state.toString(36).toUpperCase().padStart(5, '0')
                : undefined,
          )
          nativeInserts++
          const expected: Outcome =
              payload && (name === 'bytes' || name === 'size') ? { kind: 'Unknown' } : native,
            row: Row = {
              item: payload ? { kind: 'Value', value: payload } : { kind: 'Null' },
              zero: known(zero),
              expected: known('unavailable role name'),
              bypass: known(false),
            }
          references.push({
            name,
            payload: payload
              ? Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, v.toString()]))
              : null,
            zero,
            native,
            expected,
          })
          for (const origin of ['source', 'stored']) {
            fixtures.push({ name: name + '_' + origin, row, expected })
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, bypass: known(true) },
              expected: { kind: 'True' },
            })
          }
        }
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'output-reference.json'),
      JSON.stringify({ nativeInserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'acltextoutput',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
