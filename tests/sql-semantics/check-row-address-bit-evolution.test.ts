import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves captured network, MAC and bit payloads across row evolution and lazy composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-address-bit-evolution-')),
    artifact = 'artifacts/goal-checks/address-bit-row-constants-active'
  try {
    await pg.exec(`CREATE TYPE ip AS(n int4,old int4);CREATE TYPE np AS(n int4,old inet);`)
    const literals: Record<string, [string, string]> = {
        ipv4: ["INET '192.0.2.129/24'", 'inet_send'],
        ipv4_default: ["INET '255.255.255.255/0'", 'inet_send'],
        ipv6: ["INET '2001:db8::abcd/64'", 'inet_send'],
        mapped: ["INET '::ffff:192.0.2.1'", 'inet_send'],
        cidr4: ["CIDR '192.0.2.0/25'", 'cidr_send'],
        cidr6: ["CIDR '2001:db8::/32'", 'cidr_send'],
        empty_network: ["CIDR '::/0'", 'cidr_send'],
        mac: ["MACADDR '08:00:2b:01:02:03'", 'macaddr_send'],
        mac8: ["MACADDR8 '08:00:2b:ff:fe:01:02:03'", 'macaddr8_send'],
        bits: ["B'10101'", 'bit_send'],
        bits_empty: ["B''", 'bit_send'],
        varying: ["B'101010101'::varbit", 'varbit_send'],
      },
      forms: Record<string, string> = {},
      wires: Record<string, string> = {}
    for (const [name, [literal, send]] of Object.entries(literals)) {
      forms[name] =
        `ROW(n,CASE WHEN ${send}(${literal})=expected THEN 1/d ELSE NULL::int4 END)::ip IS NOT NULL`
      wires[name] = (
        await pg.query<{ wire: string }>(`SELECT encode(${send}(${literal}),'hex') wire`)
      ).rows[0]!.wire
    }
    forms.prepared_mask = "ROW(n,set_masklen(INET '192.0.2.1',33))::np IS NOT NULL"
    forms.prepared_bit = "ROW(n,get_bit(B'',0))::ip IS NOT NULL"
    forms.pruned = "CASE WHEN true THEN true ELSE ROW(n,get_bit(B'',0))::ip IS NOT NULL END"
    for (const name of ['prepared_mask', 'prepared_bit', 'pruned']) wires[name] = '00'
    for (const [name, expression] of Object.entries(forms))
      for (const witness of [false, true])
        await pg.exec(`CREATE TABLE ${witness ? 'null_' : 'evolving_'}${name}(n int4,d int4,expected bytea,bypass bool,
          CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${expression} END${witness ? ') IS NULL' : ''}))`)
    await pg.exec(`ALTER TYPE ip DROP ATTRIBUTE old;ALTER TYPE np DROP ATTRIBUTE old;`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'evolving_' + name)!,
          constraint = table.constraints[0]!
        expect(constraint.rowCoercionContext?.complete, name).toBe(true)
        expect(JSON.stringify(constraint.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name).toBe('supported')
    const known = (value: number | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const name of Object.keys(forms))
      for (const [n, d] of [
        [1, 1],
        [1, 0],
        [0, 0],
        [null, null],
        [-1, 1],
        [null, 0],
      ] as const)
        for (const wrongWire of [false, true])
          for (const bypass of [false, true]) {
            const bytes = Buffer.from(wires[name]!, 'hex')
            if (wrongWire) bytes[0] = bytes[0]! ^ 255
            let error: string | undefined,
              isNull = false
            try {
              await pg.query(`INSERT INTO evolving_${name} VALUES($1,$2,$3,$4)`, [
                n,
                d,
                bytes,
                bypass,
              ])
            } catch (e) {
              error = (e as { code: string }).code
            }
            if (!error) {
              try {
                await pg.query(`INSERT INTO null_${name} VALUES($1,$2,$3,$4)`, [
                  n,
                  d,
                  bytes,
                  bypass,
                ])
                isNull = true
              } catch (e) {
                expect((e as { code: string }).code).toBe('23514')
              }
            }
            const expected: Outcome = error
                ? error === '23514'
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(error, 36) } }
                : { kind: isNull ? 'Null' : 'True' },
              row: Row = {
                n: known(n),
                d: known(d),
                expected: { kind: 'Value', value: bytes.toString('hex') },
                bypass: known(bypass),
              }
            reference.push({ name, n, d, wrongWire, bypass, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
          }
    for (const name of Object.keys(forms))
      for (const origin of ['source', 'stored']) {
        const native = reference.find((r) => {
          const row = r as { name: string; n: number; bypass: boolean }
          return row.name === name && row.n === 1 && row.bypass
        }) as { expected: Outcome }
        fixtures.push({
          name: name + '_' + origin,
          row: {
            n: { kind: 'Unknown' },
            d: { kind: 'Error', value: { state: parseInt('22012', 36) } },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: native.expected,
        })
      }
    await mkdir(artifact, { recursive: true })
    await writeFile(join(artifact, 'plans.json'), JSON.stringify(plans, null, 2) + '\n')
    await writeFile(
      join(artifact, 'native-reference.json'),
      JSON.stringify(reference, null, 2) + '\n',
    )
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-address-bit-evolution',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
