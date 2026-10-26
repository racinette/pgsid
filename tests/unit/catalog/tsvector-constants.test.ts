import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { captureTsvectorConstantContext } from '../../../src/catalog/coercion-context.js'
import { tsvectorConstantStorage } from '../../../src/catalog/tsvector-constant-storage.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRust } from '../../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../../src/codegen/shared/check-atom-support.js'

it('captures validated tsvector storage size and count in either native byte order without reading a packed runtime representation', () => {
  for (const little of [true, false])
    for (const short of [true, false])
      for (const count of [0, 1, 2]) {
        const bytes = Buffer.alloc((short ? 1 : 4) + 4 + count * 5)
        if (short) bytes[0] = little ? bytes.length * 2 + 1 : bytes.length + 128
        else if (little) bytes.writeUInt32LE(bytes.length * 4)
        else bytes.writeUInt32BE(bytes.length)
        if (little) bytes.writeInt32LE(count, short ? 1 : 4)
        else bytes.writeInt32BE(count, short ? 1 : 4)
        const expected = { nativeBytes: 8 + count * 5, lexemeCount: count }
        expect(tsvectorConstantStorage(bytes)).toEqual(expected)
        for (const signed of [true, false]) {
          const data = [...bytes].map((b) => (signed && b > 127 ? b - 256 : b))
          const source = `{CONST :consttype 57111 :constlen -1 :constbyval false :constisnull false :constvalue ${bytes.length} [ ${data.join(' ')} ]}`
          expect(
            captureTsvectorConstantContext(source, 'CHECK (example)', new Set([57111]), new Map()),
          ).toEqual({
            definition: 'CHECK (example)',
            complete: true,
            constants: [{ site: '', storage: expected }],
          })
          expect(
            captureTsvectorConstantContext(source, 'CHECK (example)', new Set([57112]), new Map()),
          ).toBeUndefined()
        }
      }
  for (const bytes of [
    Buffer.alloc(0),
    Buffer.from([1]),
    Buffer.from([128]),
    Buffer.from([34, 0, 0, 0, 0, 0, 0, 0]),
    Buffer.from([32, 0, 0, 0, 1, 0, 0, 0]),
    Buffer.from([32, 0, 0, 0, 255, 255, 255, 255]),
  ])
    expect(tsvectorConstantStorage(bytes)).toBeUndefined()
  for (const source of [
    '{CONST :consttype 57111 :constlen -1 :constbyval false :constisnull false :constvalue 8 [ 32 0 0 0 0 0 0 256 ]}',
    '{CONST :consttype 57111 :constlen -1 :constbyval false :constisnull false :constvalue 9 [ 32 0 0 0 0 0 0 0 ]}',
    '{UNSUPPORTED :arg {CONST :consttype 57111 :constlen -1 :constbyval false :constisnull false :constvalue 8 [ 32 0 0 0 0 0 0 0 ]}}',
  ])
    expect(
      captureTsvectorConstantContext(source, 'CHECK (example)', new Set([57111]), new Map()),
    ).toMatchObject({ complete: false })
})

it('captures tsvector constants at semantic sites in independent catalogs and recovers them inside checked domains', async () => {
  const captures: unknown[] = [],
    oids: number[] = []
  for (const offset of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (offset) await pg.exec("CREATE TYPE occupy_oid AS ENUM('x')")
      await pg.exec(
        `CREATE DOMAIN imported_vector AS tsvector;CREATE DOMAIN forbidden_vector AS imported_vector CHECK(VALUE<>'bad'::tsvector);CREATE TABLE documents(source text,choice bool,CONSTRAINT direct CHECK(source::tsvector='b:2B a:1A'::tsvector),CONSTRAINT selected CHECK((CASE WHEN choice THEN 'a:1A'::tsvector ELSE 'bb'::tsvector END)=source::tsvector),CONSTRAINT checked CHECK(source::forbidden_vector IS NOT NULL))`,
      )
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'documents')!
      oids.push(catalog.domains.find((d) => d.name === 'imported_vector')!.oid)
      captures.push(table.constraints.map((c) => c.tsvectorConstants))
      const direct = table.constraints.find((c) => c.name === 'direct')!
      expect(direct.tsvectorConstants).toMatchObject({
        complete: true,
        definition: direct.definition,
        constants: [{ site: '/operator/1', storage: { nativeBytes: 28, lexemeCount: 2 } }],
      })
      const selected = table.constraints.find((c) => c.name === 'selected')!
      expect(selected.tsvectorConstants?.constants).toHaveLength(2)
      for (const c of table.constraints) {
        const prepared = prepareCheckRust(
          portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
          undefined,
          { serverEncoding: 'UTF8' },
        )
        expect(prepared.kind, c.name).toBe('supported')
        if (prepared.kind === 'supported')
          expect(prepared.evaluator.source, c.name).toContain(
            c.name === 'checked'
              ? 'tsvector_from_stored_text_native_context'
              : 'make_stored_tsvector_payload',
          )
      }
    } finally {
      await pg.close()
    }
  }
  expect(oids[0]).not.toBe(oids[1])
  expect(captures[0]).toEqual(captures[1])
}, 120_000)
