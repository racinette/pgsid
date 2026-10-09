import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { enumLabelOid } from '../../src/sql-semantics/expressions.js'
import { assembleCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'

const run = promisify(execFile)

describe('CHECK enum catalog payload', () => {
  it('retains valid label identities and defers missing or malformed metadata', () => {
    const definition = { schema: 'public', name: 'status', values: ['queued', 'done'] }
    expect(enumLabelOid(definition, 0)).toBeNull()
    for (const valueOids of [[], [1], [0, 2], [-1, 2], [1.5, 2], [4294967296, 2]])
      expect(enumLabelOid({ ...definition, valueOids }, 0)).toBeNull()
    expect(enumLabelOid({ ...definition, valueOids: [1, 4294967295] }, 0)).toBe(1)
    expect(enumLabelOid({ ...definition, valueOids: [1, 4294967295] }, 1)).toBe(4294967295)
    expect(enumLabelOid({ ...definition, valueOids: [1, 2] }, 2)).toBeNull()
  })

  it('preserves ordinals and all unsigned OID bits without changing equality in Rust, Go and TypeScript', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-enum-payload-'))
    try {
      const source = assembleCheckRust({ source: '', callables: [] })
      source.modules = source.modules.filter((module) => module.name !== 'checks')
      const generated = transpileCheckRust(source)
      const context = createContext({ exports: {} })
      runInContext(
        ts.transpileModule(generated.typescript, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText,
        context,
      )
      const runtime = context.exports as {
        makeEnumValue(ordinal: number): unknown
        makeCatalogEnumValue(ordinal: number, oid: bigint): unknown
        enumIsNull(value: unknown): unknown
        sqlPgCatalogEnumEqW63e(left: unknown, right: unknown): unknown
        sqlPgCatalogEnumNeTph2(left: unknown, right: unknown): unknown
        sqlPgCatalogEnumLargerEm2s(left: unknown, right: unknown): unknown
        sqlPgCatalogEnumSmallerWhhx(left: unknown, right: unknown): unknown
        sqlPgCatalogHashenumZ4zk(value: unknown): unknown
        sqlPgCatalogHashenumextended18hh(value: unknown, seed: unknown): unknown
      }
      for (const oid of [1n, 2147483648n, 4294967295n]) {
        const value = runtime.makeCatalogEnumValue(1, oid)
        expect(value).toEqual({ kind: 'Value', value: { ordinal: 1, labelOid: oid } })
        expect(runtime.sqlPgCatalogEnumEqW63e(value, runtime.makeEnumValue(1))).toEqual({
          kind: 'Value',
          value: true,
        })
        expect(runtime.sqlPgCatalogEnumNeTph2(value, runtime.makeEnumValue(0))).toEqual({
          kind: 'Value',
          value: true,
        })
        expect(runtime.enumIsNull(value)).toEqual({ kind: 'Value', value: false })
        const legacy = runtime.makeEnumValue(1)
        expect(runtime.sqlPgCatalogEnumLargerEm2s(legacy, value)).toEqual(value)
        expect(runtime.sqlPgCatalogEnumSmallerWhhx(legacy, value)).toEqual(value)
        expect(runtime.sqlPgCatalogEnumLargerEm2s(value, legacy)).toEqual(legacy)
        expect(runtime.sqlPgCatalogEnumSmallerWhhx(value, legacy)).toEqual(legacy)
      }
      for (const oid of [-1n, 0n, 4294967296n])
        expect(runtime.makeCatalogEnumValue(1, oid)).toEqual({ kind: 'Unknown' })
      expect(runtime.makeCatalogEnumValue(-1, 1n)).toEqual({ kind: 'Unknown' })
      expect(runtime.makeEnumValue(1)).toEqual({
        kind: 'Value',
        value: { ordinal: 1, labelOid: 0n },
      })
      expect(runtime.sqlPgCatalogHashenumZ4zk(runtime.makeEnumValue(1))).toEqual({
        kind: 'Unknown',
      })
      expect(
        runtime.sqlPgCatalogHashenumextended18hh(runtime.makeEnumValue(1), {
          kind: 'Value',
          value: 0n,
        }),
      ).toEqual({ kind: 'Unknown' })
      writeCheckRustSources(join(directory, 'runtime.rs'), source)
      await writeFile(
        join(directory, 'native.rs'),
        String.raw`include!("runtime.rs");
#[test] fn enum_payload() {
    for oid in [1i64, 2147483648, 4294967295] {
        let value = make_catalog_enum_value(1, oid);
        if let EnumValue::Value(payload) = value {
            assert_eq!(payload.ordinal, 1); assert_eq!(payload.label_oid, oid);
        } else { panic!("missing payload"); }
        assert!(sql__pg_catalog__enum_eq__w63e(value, make_enum_value(1)) == BoolValue::Value(true));
        assert!(sql__pg_catalog__enum_ne__tph2(value, make_enum_value(0)) == BoolValue::Value(true));
        assert!(enum_is_null(value) == BoolValue::Value(false));
        let legacy = make_enum_value(1);
        assert!(sql__pg_catalog__enum_larger__em2s(legacy, value) == value);
        assert!(sql__pg_catalog__enum_smaller__whhx(legacy, value) == value);
        assert!(sql__pg_catalog__enum_larger__em2s(value, legacy) == legacy);
        assert!(sql__pg_catalog__enum_smaller__whhx(value, legacy) == legacy);
    }
    for oid in [-1i64, 0, 4294967296] { assert!(make_catalog_enum_value(1, oid) == EnumValue::Unknown); }
    assert!(make_catalog_enum_value(-1, 1) == EnumValue::Unknown);
    if let EnumValue::Value(payload) = make_enum_value(1) { assert_eq!(payload.label_oid, 0); }
    assert!(sql__pg_catalog__hashenum__z4zk(make_enum_value(1)) == Int4Value::Unknown);
    assert!(sql__pg_catalog__hashenumextended__18hh(make_enum_value(1), make_int8_value(0)) == Int8Value::Unknown);
}`,
      )
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module enumpayload\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        String.raw`package generated
import "testing"
func TestEnumPayload(t *testing.T) {
    for _, oid := range []int64{1, 2147483648, 4294967295} {
        value := MakeCatalogEnumValue(1, oid)
        if value.Kind != EnumValueValue || value.Value.Ordinal != 1 || value.Value.LabelOid != oid { t.Fatal(value) }
        if !SqlPgCatalogEnumEqW63e(value, MakeEnumValue(1)).Value { t.Fatal("equality", oid) }
        if !SqlPgCatalogEnumNeTph2(value, MakeEnumValue(0)).Value { t.Fatal("inequality", oid) }
        if EnumIsNull(value).Value { t.Fatal("null", oid) }
        legacy := MakeEnumValue(1)
        if SqlPgCatalogEnumLargerEm2s(legacy, value) != value || SqlPgCatalogEnumSmallerWhhx(legacy, value) != value { t.Fatal("catalog tie", oid) }
        if SqlPgCatalogEnumLargerEm2s(value, legacy) != legacy || SqlPgCatalogEnumSmallerWhhx(value, legacy) != legacy { t.Fatal("legacy tie", oid) }
    }
    for _, oid := range []int64{-1, 0, 4294967296} { if MakeCatalogEnumValue(1, oid).Kind != EnumValueUnknown { t.Fatal(oid) } }
    if MakeCatalogEnumValue(-1, 1).Kind != EnumValueUnknown { t.Fatal("ordinal") }
    if MakeEnumValue(1).Value.LabelOid != 0 { t.Fatal("legacy") }
    if SqlPgCatalogHashenumZ4zk(MakeEnumValue(1)).Kind != Int4ValueUnknown { t.Fatal("legacy hash") }
    if SqlPgCatalogHashenumextended18hh(MakeEnumValue(1), MakeInt8Value(0)).Kind != Int8ValueUnknown { t.Fatal("legacy seeded hash") }
}`,
      )
      await run('rustc', [
        '--edition=2021',
        '--test',
        join(directory, 'native.rs'),
        '-o',
        join(directory, 'native'),
      ])
      await run(join(directory, 'native'))
      await run('go', ['test', './...'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 120000)
})
