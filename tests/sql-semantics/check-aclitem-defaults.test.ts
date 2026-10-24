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
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import type {
  OwnedArrayInputPayload,
  OwnedArrayInputCell,
} from '../../tools/check-rust/array-input.js'

it('constructs exact PostgreSQL default ACLs from supplied owners, retaining column-empty shape and pure privilege semantics in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-defaults-')),
    packet = 'artifacts/goal-checks/aclitem-defaults-active'
  const a = 'acldefault(objtype,owner_id)',
    expressions: Record<string, string> = {
      exact: `${a} IS NOT DISTINCT FROM expected`,
      hash: `hash_array(${a}) IS NOT DISTINCT FROM recorded_hash`,
      extended: `hash_array_extended(${a},-1) IS NOT DISTINCT FROM recorded_extended`,
      count: `cardinality(${a}) IS NOT DISTINCT FROM recorded_count`,
      dimensions: `array_ndims(${a}) IS NOT DISTINCT FROM recorded_ndims`,
      length: `array_length(${a},1) IS NOT DISTINCT FROM recorded_length`,
      lower: `array_lower(${a},1) IS NOT DISTINCT FROM recorded_lower`,
      upper: `array_upper(${a},1) IS NOT DISTINCT FROM recorded_upper`,
      canonical_empty: `${a}=ARRAY[]::aclitem[]`,
      owner_select: `aclcontains(${a},makeaclitem(owner_id,owner_id,'SELECT',false))`,
      owner_grant_option: `aclcontains(${a},makeaclitem(owner_id,owner_id,'SELECT',true))`,
      coalesced: `cardinality(COALESCE(${a},ARRAY[]::aclitem[]))=COALESCE(recorded_count,0)`,
    }
  const known = (v: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
      v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
    bits: Record<string, bigint> = {
      INSERT: 1n,
      SELECT: 2n,
      UPDATE: 4n,
      DELETE: 8n,
      TRUNCATE: 16n,
      REFERENCES: 32n,
      TRIGGER: 64n,
      EXECUTE: 128n,
      USAGE: 256n,
      CREATE: 512n,
      TEMPORARY: 1024n,
      CONNECT: 2048n,
      SET: 4096n,
      'ALTER SYSTEM': 8192n,
      MAINTAIN: 16384n,
    }
  try {
    const columns =
      'objtype "char",owner_id oid,expected aclitem[],recorded_hash int,recorded_extended bigint,recorded_count int,recorded_ndims int,recorded_length int,recorded_lower int,recorded_upper int,bypass boolean'
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE default_acl_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'default_acl_' + name)!,
          c = table.constraints[0]!
        return ['source', 'stored'].map((origin) => ({
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let nativeInserts = 0,
      rejections = 0
    for (const code of [
      ...'crsdflLnptFST'.split('').map((c) => c.charCodeAt(0)),
      0,
      1,
      32,
      65,
      127,
      128,
      255,
      null,
    ])
      for (const owner of [0n, 1n, 2147483648n, 4294967295n, null]) {
        const nativeType = code === null ? null : code >= 128 ? code - 256 : code,
          params = [nativeType, owner === null ? null : owner.toString()]
        let metadata:
            | {
                count: number | null
                ndims: number | null
                length: number | null
                lower: number | null
                upper: number | null
                hash: number | null
                extended: string | null
              }
            | undefined,
          payload: OwnedArrayInputPayload | null = null
        try {
          metadata = (
            await pg.query<{
              count: number | null
              ndims: number | null
              length: number | null
              lower: number | null
              upper: number | null
              hash: number | null
              extended: string | null
            }>(
              `SELECT cardinality(a) count,array_ndims(a) ndims,array_length(a,1) length,array_lower(a,1) lower,array_upper(a,1) upper,hash_array(a) hash,hash_array_extended(a,-1)::text extended FROM(SELECT acldefault($1::int4::"char",$2::oid) a) q`,
              params,
            )
          ).rows[0]!
          if (metadata.ndims !== null) {
            const grants = (
                await pg.query<{
                  ord: number
                  grantee: string
                  grantor: string
                  privilege_type: string
                  is_grantable: boolean
                }>(
                  `SELECT u.ord::int ord,e.grantee::text,e.grantor::text,e.privilege_type,e.is_grantable FROM(SELECT acldefault($1::int4::"char",$2::oid) a) q CROSS JOIN LATERAL unnest(a) WITH ORDINALITY u(entry,ord) CROSS JOIN LATERAL aclexplode(ARRAY[u.entry]) e ORDER BY u.ord`,
                  params,
                )
              ).rows,
              entries = new Map<
                number,
                { grantee: bigint; grantor: bigint; privileges: bigint; grantOptions: bigint }
              >()
            for (const grant of grants) {
              const value = entries.get(grant.ord) ?? {
                grantee: BigInt(grant.grantee),
                grantor: BigInt(grant.grantor),
                privileges: 0n,
                grantOptions: 0n,
              }
              const bit = bits[grant.privilege_type]!
              expect(bit).toBeDefined()
              value.privileges |= bit
              if (grant.is_grantable) value.grantOptions |= bit
              entries.set(grant.ord, value)
            }
            payload = {
              elementType: 'pg_catalog.aclitem',
              elementKind: 46,
              dimensions: [{ lower: metadata.lower!, length: metadata.length! }],
              elements: [...entries.values()].map(
                (value) => ({ kind: 'Aclitem', value }) as OwnedArrayInputCell,
              ),
              nullBitmap: { kind: 'Value', value: false },
            }
            if (code === 99) {
              expect(metadata.ndims).toBe(1)
              expect(metadata.length).toBe(0)
              expect(metadata.upper).toBe(0)
              expect(payload.elements).toEqual([])
            }
          }
        } catch (error) {
          expect((error as { code: string }).code).toBe('XX000')
        }
        const row: Row = {
            objtype: known(code),
            owner_id: known(owner),
            expected: known(payload),
            recorded_hash: known(metadata?.hash ?? null),
            recorded_extended: known(
              metadata?.extended === null || metadata === undefined
                ? null
                : BigInt(metadata.extended),
            ),
            recorded_count: known(metadata?.count ?? null),
            recorded_ndims: known(metadata?.ndims ?? null),
            recorded_length: known(metadata?.length ?? null),
            recorded_lower: known(metadata?.lower ?? null),
            recorded_upper: known(metadata?.upper ?? null),
            bypass: known(false),
          },
          args = [
            ...params,
            metadata?.hash ?? null,
            metadata?.extended ?? null,
            metadata?.count ?? null,
            metadata?.ndims ?? null,
            metadata?.length ?? null,
            metadata?.lower ?? null,
            metadata?.upper ?? null,
          ],
          source = `SELECT $1::int4::"char" objtype,$2::oid owner_id,acldefault($1::int4::"char",$2::oid) expected,$3::int recorded_hash,$4::bigint recorded_extended,$5::int recorded_count,$6::int recorded_ndims,$7::int recorded_length,$8::int recorded_lower,$9::int recorded_upper,false bypass`
        for (const [name, sql] of Object.entries(expressions)) {
          let expected: Outcome
          try {
            const result = (
              await pg.query<{ v: boolean | null }>(`SELECT ${sql} v FROM(${source}) q`, args)
            ).rows[0]!.v
            expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          let rejection: string | undefined
          try {
            await pg.query(`INSERT INTO default_acl_${name} ${source}`, args)
          } catch (error) {
            rejection = (error as { code: string }).code
          }
          expect(rejection, `${name}/${code}/${owner}`).toBe(
            expected.kind === 'False'
              ? '23514'
              : expected.kind === 'Error'
                ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                : undefined,
          )
          nativeInserts++
          if (rejection) rejections++
          for (const origin of ['source', 'stored']) {
            fixtures.push({ name: name + '_' + origin, row, expected })
            if (expected.kind === 'Error')
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, bypass: known(true) },
                expected: { kind: 'True' },
              })
          }
          reference.push({ name, code, owner: owner?.toString() ?? null, expected })
        }
      }
    const partial: Row = {
      objtype: known(114),
      owner_id: { kind: 'Unknown' },
      bypass: known(false),
    }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'canonical_empty_' + origin,
        row: partial,
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: 'canonical_empty_' + origin,
        row: { ...partial, bypass: known(true) },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'canonical_empty_' + origin,
        row: { ...partial, owner_id: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'reference.json'),
      JSON.stringify({ nativeInserts, rejections, fixtures: fixtures.length, reference }, null, 2) +
        '\n',
    )
    await runCheckParity(
      root,
      'acldefault',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `ACL defaults: ${nativeInserts} native INSERTs, ${rejections} native rejections and ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
