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

it('constructs and compares supplied ACL identities and hashes without a role catalog in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-core-'))
  const packet = 'artifacts/goal-checks/aclitem-core-active'
  const a = 'makeaclitem(grantee,grantor,privileges,grantable)',
    b = 'makeaclitem(other_grantee,other_grantor,other_privileges,other_grantable)'
  const expressions: Record<string, string> = {
    equality: `${a} = ${b}`,
    hash: `hash_aclitem(${a}) = expected_hash`,
    extended: `hash_aclitem_extended(${a},seed) = expected_extended`,
    nullness: `${a} IS NULL`,
    distinctness: `${a} IS DISTINCT FROM ${b}`,
    selected: `(CASE WHEN choose_first THEN ${a} ELSE ${b} END) = ${b}`,
    coalesced: `COALESCE(${a},${b}) = ${b}`,
    nulled: `NULLIF(${a},${b}) IS NULL`,
    lazy: `CASE WHEN bypass THEN true ELSE ${a} = ${b} END`,
  }
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    for (const [name, expression] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE acl_${name}(grantee oid,grantor oid,privileges text,grantable boolean,other_grantee oid,other_grantor oid,other_privileges text,other_grantable boolean,seed bigint,expected_hash int,expected_extended bigint,choose_first boolean,bypass boolean,CONSTRAINT rule CHECK(${expression}))`,
      )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'acl_' + name)!,
          c = table.constraints[0]!
        return ['raw', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'raw' ? { ...c, definition: `CHECK(${expression})` } : c,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks)
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const privileges = [
      'INSERT',
      'SELECT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'REFERENCES',
      'TRIGGER',
      'EXECUTE',
      'USAGE',
      'CREATE',
      'TEMP',
      'TEMPORARY',
      'CONNECT',
      'SET',
      'ALTER SYSTEM',
      'MAINTAIN',
      'select,INSERT,Select',
      '\tmaintain\n, temporary\r',
      'SELECT,UPDATE,MAINTAIN',
      '',
      ',SELECT',
      'SELECT,',
      'SELECT,,UPDATE',
      'ALL',
      'SELECT WITH GRANT OPTION',
      'ALTER  SYSTEM',
      'sélect',
      'SELECT\u00a0',
      null,
    ]
    const ids = [0n, 1n, 2147483647n, 2147483648n, 4294967295n, null],
      seeds = [0n, 1n, -1n, 9223372036854775807n, -9223372036854775808n]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (let i = 0; i < privileges.length; i++)
      for (let variant = 0; variant < 4; variant++) {
        const privilege = privileges[i]!,
          grantee = ids[(i + variant) % ids.length]!,
          grantor = ids[(i + variant + 2) % ids.length]!,
          grantable = variant === 3 ? null : variant === 1,
          otherGrantee = variant === 1 ? 42n : grantee,
          otherGrantor = variant === 2 ? 43n : grantor,
          otherPrivilege = variant === 0 ? privilege : 'SELECT',
          seed = seeds[(i + variant) % seeds.length]!
        const values = [
          grantee?.toString() ?? null,
          grantor?.toString() ?? null,
          privilege,
          grantable,
          otherGrantee?.toString() ?? null,
          otherGrantor?.toString() ?? null,
          otherPrivilege,
          false,
          seed.toString(),
          0,
          '0',
          variant % 2 === 0,
          variant === 3,
        ]
        let hash = 0,
          extended = 0n
        try {
          const r = (
            await pg.query<{ h: number | null; e: string | null }>(
              `SELECT hash_aclitem(makeaclitem($1::oid,$2::oid,$3::text,$4::bool)) h,hash_aclitem_extended(makeaclitem($1::oid,$2::oid,$3::text,$4::bool),$5::bigint)::text e`,
              values.slice(0, 4).concat(seed.toString()),
            )
          ).rows[0]!
          hash = r.h ?? 0
          extended = BigInt(r.e ?? 0)
        } catch {
          /* Error cases are checked by their INSERT below. */
        }
        values[9] = hash
        values[10] = extended.toString()
        const row: Row = {
          grantee: known(grantee),
          grantor: known(grantor),
          privileges: known(privilege),
          grantable: known(grantable),
          other_grantee: known(otherGrantee),
          other_grantor: known(otherGrantor),
          other_privileges: known(otherPrivilege),
          other_grantable: known(false),
          seed: known(seed),
          expected_hash: known(hash),
          expected_extended: known(extended),
          choose_first: known(variant % 2 === 0),
          bypass: known(variant === 3),
        }
        for (const name of Object.keys(expressions)) {
          const placeholders = values.map((_, i) => '$' + (i + 1)).join(',')
          let expected: Outcome
          try {
            const result = (
              await pg.query<Record<string, boolean | null>>(
                `SELECT ${expressions[name]} AS result FROM (SELECT $1::oid grantee,$2::oid grantor,$3::text privileges,$4::bool grantable,$5::oid other_grantee,$6::oid other_grantor,$7::text other_privileges,$8::bool other_grantable,$9::bigint seed,$10::int expected_hash,$11::bigint expected_extended,$12::bool choose_first,$13::bool bypass) inputs`,
                values,
              )
            ).rows[0]!.result
            expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (e) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((e as { code: string }).code, 36) },
            }
          }
          let code: string | undefined
          try {
            await pg.query(`INSERT INTO acl_${name} VALUES(${placeholders})`, values)
          } catch (e) {
            code = (e as { code: string }).code
          }
          expect(code, `${name}/${i}/${variant}`).toBe(
            expected.kind === 'False'
              ? '23514'
              : expected.kind === 'Error'
                ? expected.value.state.toString(36).toUpperCase()
                : undefined,
          )
          inserts++
          for (const suffix of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + suffix, row, expected })
          references.push({ name, privilege, variant, expected })
        }
      }
    const base: Row = {
      grantee: known(1n),
      grantor: known(2n),
      privileges: known('SELECT'),
      grantable: known(false),
      other_grantee: known(1n),
      other_grantor: known(2n),
      other_privileges: known('SELECT'),
      other_grantable: known(false),
      seed: known(0n),
      expected_hash: known(5),
      expected_extended: known(5n),
      choose_first: known(true),
      bypass: known(false),
    }
    for (const suffix of ['raw', 'stored']) {
      fixtures.push({
        name: 'equality_' + suffix,
        row: { ...base, grantee: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: 'lazy_' + suffix,
        row: { ...base, grantee: { kind: 'Unknown' }, bypass: known(true) },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'equality_' + suffix,
        row: { ...base, privileges: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'reference.json'),
      JSON.stringify({ nativeInserts: inserts, fixtures: fixtures.length, references }, null, 2) +
        '\n',
    )
    await mkdir(join(root, 'core'))
    await runCheckParity(
      join(root, 'core'),
      'aclitemcore',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `ACL core: ${inserts} native INSERTs and ${fixtures.length} Rust/Go/TypeScript fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
