import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { checkUnknownMessage } from '../../src/codegen/shared/check-diagnostics.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })
const packet = 'artifacts/goal-checks/aclitem-json-active'

it('converts ACL scalar, domain, array and record JSON inputs with strict NULLs, builders and ordered errors in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-json-'))
  const operations: Record<
    string,
    { sql: string; pretty?: boolean; ordered?: boolean; arity?: boolean }
  > = {
    raw: { sql: 'to_json(item)::text' },
    binary: { sql: 'to_jsonb(item)::text' },
    domain: { sql: 'to_jsonb(item::imported_acl)::text' },
    required: { sql: 'to_jsonb(item::required_acl)::text' },
    raw_array: { sql: 'array_to_json(ARRAY[item,NULL],pretty)::text', pretty: true },
    binary_array: { sql: 'to_jsonb(ARRAY[item,NULL])::text' },
    domain_array: { sql: 'to_jsonb(ARRAY[item,NULL]::imported_acl[])::text' },
    nested_array: { sql: 'to_jsonb(ARRAY[ARRAY[item,NULL],ARRAY[item,item]])::text' },
    raw_record: { sql: 'row_to_json(ROW(item,ARRAY[item]),pretty)::text', pretty: true },
    binary_record: { sql: 'to_jsonb(ROW(item,ARRAY[item]))::text' },
    raw_builder: { sql: 'json_build_array(item,1,NULL)::text' },
    binary_builder: { sql: 'jsonb_build_array(item,1,NULL)::text' },
    raw_object: { sql: "json_build_object('entry',item,'list',ARRAY[item])::text" },
    binary_object: { sql: "jsonb_build_object('entry',item,'list',ARRAY[item])::text" },
    raw_key: { sql: 'json_build_object(item,1)::text' },
    binary_key: { sql: 'jsonb_build_object(item,1)::text' },
    raw_arity: { sql: 'json_build_object(item)::text', arity: true },
    binary_arity: { sql: 'jsonb_build_object(item)::text', arity: true },
    raw_order: { sql: 'json_build_object(item,1/zero)::text', ordered: true },
    binary_order: { sql: 'jsonb_build_object(item,1/zero)::text', ordered: true },
    raw_coalesced: { sql: 'COALESCE(to_json(item),(1/zero)::text::json)::text' },
    binary_coalesced: { sql: 'COALESCE(to_jsonb(item),(1/zero)::text::jsonb)::text' },
  }
  try {
    await pg.exec(
      'CREATE DOMAIN imported_acl AS aclitem;CREATE DOMAIN required_acl AS aclitem NOT NULL',
    )
    for (const [name, d] of Object.entries(operations))
      await pg.exec(
        `CREATE TABLE acl_json_${name}(item aclitem,pretty boolean,zero integer,expected_text text,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE (${d.sql}) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END))`,
      )
    await pg.exec(
      'CREATE TEMP TABLE acl_json_input(item aclitem,pretty boolean,zero integer,expected_text text,bypass boolean)',
    )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(operations).flatMap(([name, d]) => {
        const table = catalog.tables.find((t) => t.name === 'acl_json_' + name)!,
          c = table.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => {
          const expression = portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? {
                    ...c,
                    definition: `CHECK(CASE WHEN bypass THEN true ELSE (${d.sql}) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END)`,
                  }
                : c,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          )
          expect(hasUncertain(expression), name + '_' + origin).toBe(false)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + origin,
            },
            expression,
          }
        })
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
    let nativeInserts = 0,
      nativeRejections = 0
    const payloads = [
      null,
      { grantee: 0n, grantor: 0n, privileges: 2n, grantOptions: 0n },
      { grantee: 4294967295n, grantor: 4294967294n, privileges: 2n, grantOptions: 0n },
    ]
    for (const item of payloads)
      for (const pretty of [false, true, null])
        for (const zero of [0, 1]) {
          await pg.query('DELETE FROM acl_json_input')
          await pg.query(
            "INSERT INTO acl_json_input SELECT makeaclitem($1::oid,$2::oid,'SELECT',false),$3::bool,$4::int,NULL,false",
            [item?.grantee.toString() ?? null, item?.grantor.toString() ?? null, pretty, zero],
          )
          for (const [name, d] of Object.entries(operations)) {
            let value: string | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${d.sql}) AS value FROM acl_json_input`,
                )
              ).rows[0]!.value
            } catch (e) {
              state = (e as { code: string }).code
            }
            for (const wrong of [false, true]) {
              const expectedText = wrong ? 'unavailable text' : value
              await pg.query('UPDATE acl_json_input SET expected_text=$1', [expectedText])
              let native: Outcome
              try {
                const v = (
                  await pg.query<{ value: boolean }>(
                    `SELECT (${d.sql}) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" AS value FROM acl_json_input`,
                  )
                ).rows[0]!.value
                native = { kind: v ? 'True' : 'False' }
              } catch (e) {
                native = error((e as { code: string }).code)
              }
              if (state) expect(native).toEqual(error(state))
              let failure: string | undefined
              try {
                await pg.query(`INSERT INTO acl_json_${name} SELECT * FROM acl_json_input`)
              } catch (e) {
                failure = (e as { code: string }).code
                nativeRejections++
              }
              expect(failure, name).toBe(
                native.kind === 'False'
                  ? '23514'
                  : native.kind === 'Error'
                    ? native.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : undefined,
              )
              nativeInserts++
              const dependent =
                  item !== null &&
                  !d.arity &&
                  !(d.pretty && pretty === null) &&
                  !(d.ordered && zero === 0),
                expected: Outcome = dependent ? { kind: 'Unknown' } : native,
                row: Row = {
                  item: item ? { kind: 'Value', value: item } : { kind: 'Null' },
                  pretty: known(pretty),
                  zero: known(zero),
                  expected_text: known(expectedText),
                  bypass: known(false),
                }
              references.push({
                name,
                item: item ? 'supplied words' : 'NULL',
                pretty,
                zero,
                wrong,
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
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'conversion-reference.json'),
      JSON.stringify(
        { nativeInserts, nativeRejections, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'aclitemjson',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `ACL JSON: ${nativeInserts} native INSERTs, ${nativeRejections} rejections, ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('preserves runtime ACL cast errors before JSON strictness, arity and later argument errors in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-json-casts-'))
  const expressions: Record<string, string> = {
    scalar: 'to_jsonb(source::aclitem) IS NULL',
    raw_array: 'json_build_array(source::aclitem,1/zero) IS NULL',
    binary_array: 'jsonb_build_array(source::aclitem,1/zero) IS NULL',
    raw_arity: 'json_build_object(source::aclitem) IS NULL',
    binary_arity: 'jsonb_build_object(source::aclitem) IS NULL',
    pretty_array: 'array_to_json(ARRAY[source::aclitem],pretty) IS NULL',
    pretty_record: 'row_to_json(ROW(source::aclitem,1/zero),pretty) IS NULL',
    object_key: 'jsonb_build_object(source::aclitem,1/zero) IS NULL',
  }
  try {
    await pg.exec('CREATE ROLE acl_json_reader')
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE acl_json_cast_${name}(source text,pretty boolean,zero int,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(
      'CREATE TEMP TABLE acl_json_cast_input(source text,pretty boolean,zero int,bypass boolean)',
    )
    const maxIdentifierBytes = (
        await pg.query<{ value: number }>(
          "SELECT current_setting('max_identifier_length')::int value",
        )
      ).rows[0]!.value,
      catalog = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'acl_json_cast_' + name)!,
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
        maxIdentifierBytes,
        serverEncoding: 'UTF8',
        defaultCollation: 'C',
        arrayNulls: true,
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    let nativeInserts = 0,
      nativeRejections = 0
    for (const source of [
      null,
      '',
      '=r/',
      ';',
      'acl_json_reader=r/acl_json_reader',
      'missing_acl_json_reader=r/no_role',
      '=r',
    ])
      for (const pretty of [false, null])
        for (const zero of [0, 1]) {
          await pg.query('DELETE FROM acl_json_cast_input')
          await pg.query('INSERT INTO acl_json_cast_input VALUES($1,$2,$3,false)', [
            source,
            pretty,
            zero,
          ])
          for (const [name, sql] of Object.entries(expressions)) {
            let native: Outcome
            try {
              const v = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (${sql}) value FROM acl_json_cast_input`,
                )
              ).rows[0]!.value
              native = { kind: v === null ? 'Null' : v ? 'True' : 'False' }
            } catch (e) {
              native = error((e as { code: string }).code)
            }
            let failure: string | undefined
            try {
              await pg.query(`INSERT INTO acl_json_cast_${name} SELECT * FROM acl_json_cast_input`)
            } catch (e) {
              failure = (e as { code: string }).code
              nativeRejections++
            }
            expect(failure, source + ':' + name).toBe(
              native.kind === 'False'
                ? '23514'
                : native.kind === 'Error'
                  ? native.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : undefined,
            )
            nativeInserts++
            const expected: Outcome =
                source !== null && source !== '' && source !== '=r/' && source !== ';'
                  ? { kind: 'Unknown' }
                  : native,
              row: Row = {
                source: known(source),
                pretty: known(pretty),
                zero: known(zero),
                bypass: known(false),
              }
            references.push({ source, pretty, zero, name, native, expected })
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
      join(packet, 'cast-reference.json'),
      JSON.stringify(
        { nativeInserts, nativeRejections, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'aclitemjsoncasts',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `ACL JSON casts: ${nativeInserts} native INSERTs, ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('reports ACL role-catalog requirements for JSON values without attaching them to portable numeric hashes', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TYPE acl_json_record AS(entry aclitem,total integer);CREATE DOMAIN acl_json_group AS aclitem[]',
    )
    const expressions = {
      scalar: 'to_jsonb(item) IS NULL',
      array: 'to_jsonb(entries) IS NULL',
      record: 'row_to_json(audit) IS NULL',
      nested: 'jsonb_build_array(ROW(item,entries)) IS NULL',
      builder: "json_build_object('entry',item) IS NULL",
      hash: "to_jsonb(hash_aclitem(item))='0'::jsonb",
    }
    await pg.exec(
      `CREATE TABLE acl_json_diagnostics(item aclitem,entries acl_json_group,audit acl_json_record,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'acl_json_diagnostics')!
    for (const [name, sql] of Object.entries(expressions))
      for (const origin of ['source', 'stored'] as const) {
        const c = table.constraints.find((c) => c.name === name)!,
          expression = portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source' ? { ...c, definition: `CHECK(${sql})` } : c,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          )
        expect(
          checkUnknownMessage(expression).includes('deployment role catalog'),
          name + '_' + origin,
        ).toBe(name !== 'hash')
      }
  } finally {
    await pg.close()
  }
})
