import { describe, expect, it, vi } from 'vitest'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  assembleCheckRust,
  type CheckRustSource,
} from '../../src/codegen/shared/check-rust-source.js'

vi.mock('../../src/codegen/shared/check-rust-assets.js', () => ({
  checkRustAsset: () => Buffer.from(JSON.stringify(fixture())),
}))

function fixture(): CheckRustSource {
  const truncation = builtinCallables().find(
    (item): item is FunctionMetadata =>
      item.kind === 'function' && item.name === 'date_trunc' && item.args.length === 3,
  )!
  const conversion = builtinCallables().find(
    (item): item is FunctionMetadata =>
      item.kind === 'function' &&
      item.name === 'timezone' &&
      item.args[1] === 'pg_catalog."timestamp"',
  )!
  const regex = builtinCallables().find(
    (item): item is FunctionMetadata => item.kind === 'function' && item.name === 'textregexeq',
  )!
  const count = builtinCallables().find(
    (item): item is FunctionMetadata =>
      item.kind === 'function' && item.name === 'regexp_count' && item.args.length === 2,
  )!
  const normalization = builtinCallables().find(
    (item): item is FunctionMetadata => item.kind === 'function' && item.name === 'normalize',
  )!
  return {
    schemaVersion: 1,
    modules: [
      {
        name: 'checkruntime',
        dependencies: [],
        files: [
          { path: 'runtime/values.rs', source: '' },
          { path: 'runtime/unicode.rs', source: '' },
          { path: 'generated/unicode_tables.rs', source: '' },
        ],
      },
      {
        name: 'regex_engine',
        dependencies: [],
        files: [{ path: 'engine/lib.rs', source: 'fn find() {}' }],
      },
      {
        name: 'pg_catalog',
        dependencies: ['checkruntime', 'regex_engine'],
        files: [
          {
            path: 'operations/pg_catalog/timezone.rs',
            source: `pub fn ${conversion.rustName}() {}`,
          },
          {
            path: 'operations/pg_catalog/timezone_trunc.rs',
            source: `pub fn ${truncation.rustName}() {}`,
          },
          { path: 'operations/pg_catalog/timezone_named.rs', source: 'fn resolve_named_zone() {}' },
          {
            path: 'operations/pg_catalog/timezone_tables.rs',
            source: 'const ZONES: &[i32] = &[0];',
          },
          { path: 'operations/pg_catalog/integer.rs', source: 'fn integer_helper() {}' },
          {
            path: 'operations/pg_catalog/text_unicode.rs',
            source: `pub fn ${normalization.rustName}() {}`,
          },
          { path: 'operations/pg_catalog/regex.rs', source: `pub fn ${regex.rustName}() {}` },
          { path: 'operations/pg_catalog/regex_count.rs', source: `pub fn ${count.rustName}() {}` },
        ],
      },
    ],
  }
}

describe('CHECK operation source dependencies', () => {
  it('retains the timezone group for every callable declared there, regardless of its SQL name', () => {
    const source = fixture()
    const timezoneFiles = source.modules[2]!.files.filter((file) => file.path.includes('/timezone'))
    for (const file of timezoneFiles) {
      const name = /pub fn (sql__[a-z0-9_]+)\(/u.exec(file.source)?.[1]
      if (!name) continue
      const assembled = assembleCheckRust({ source: '', callables: [name] })
      expect(assembled.modules.find((module) => module.name === 'pg_catalog')?.files).toEqual(
        source.modules[2]!.files.filter(
          (file) => !file.path.includes('/regex') && !file.path.includes('/text_unicode'),
        ),
      )
    }
  })

  it('omits the timezone group when no requested callable depends on it', () => {
    const assembled = assembleCheckRust({ source: '', callables: [] })
    expect(assembled.modules.find((module) => module.name === 'pg_catalog')?.files).toEqual(
      fixture().modules[2]!.files.filter(
        (file) =>
          !file.path.includes('/timezone') &&
          !file.path.includes('/regex') &&
          !file.path.includes('/text_unicode'),
      ),
    )
  })
  it('retains shared Unicode tables and helpers only for a Unicode catalog callable', () => {
    const original = fixture()
    const operation = original.modules[2]!.files.find((file) =>
      file.path.endsWith('/text_unicode.rs'),
    )!
    const name = /pub fn (sql__[a-z0-9_]+)\(/u.exec(operation.source)![1]!
    const selected = assembleCheckRust({ source: '', callables: [name] })
    expect(selected.modules.find((module) => module.name === 'checkruntime')).toEqual(
      original.modules[0],
    )
    expect(
      selected.modules
        .find((module) => module.name === 'pg_catalog')!
        .files.map((file) => file.path),
    ).toEqual(['operations/pg_catalog/integer.rs', 'operations/pg_catalog/text_unicode.rs'])
    const unrelated = assembleCheckRust({ source: '', callables: [] })
    expect(
      unrelated.modules
        .find((module) => module.name === 'checkruntime')!
        .files.map((file) => file.path),
    ).toEqual(['runtime/values.rs'])
  })
  it('retains the regex engine and every regex source file for a callable owned by that group', () => {
    const source = fixture()
    for (const file of source.modules[2]!.files.filter((file) => file.path.includes('/regex'))) {
      const name = /pub fn (sql__[a-z0-9_]+)\(/u.exec(file.source)![1]!
      const assembled = assembleCheckRust({ source: '', callables: [name] })
      expect(assembled.modules.find((module) => module.name === 'regex_engine')).toEqual(
        source.modules[1],
      )
      const schema = assembled.modules.find((module) => module.name === 'pg_catalog')!
      expect(schema.dependencies).toContain('regex_engine')
      expect(schema.files.filter((file) => file.path.includes('/regex'))).toHaveLength(2)
      expect(schema.files.some((file) => file.path.includes('/timezone'))).toBe(false)
    }
  })
  it('retains regex support for legacy evaluator expressions and omits it otherwise', () => {
    const legacy = assembleCheckRust({ source: '', callables: [], requiresRegex: true })
    expect(legacy.modules.find((module) => module.name === 'regex_engine')).toBeDefined()
    const scalar = assembleCheckRust({ source: '', callables: [] })
    expect(scalar.modules.find((module) => module.name === 'regex_engine')).toBeUndefined()
    expect(scalar.modules.find((module) => module.name === 'pg_catalog')!.dependencies).toEqual([
      'checkruntime',
    ])
    expect(
      scalar.modules.find((module) => module.name === 'pg_catalog')!.files.map((file) => file.path),
    ).toEqual(['operations/pg_catalog/integer.rs'])
  })
})
