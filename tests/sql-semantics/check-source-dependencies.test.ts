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
  return {
    schemaVersion: 1,
    modules: [
      { name: 'checkruntime', dependencies: [], files: [] },
      {
        name: 'pg_catalog',
        dependencies: ['checkruntime'],
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
        ],
      },
    ],
  }
}

describe('CHECK operation source dependencies', () => {
  it('retains the timezone group for every callable declared there, regardless of its SQL name', () => {
    const source = fixture()
    const timezoneFiles = source.modules[1]!.files.filter((file) => file.path.includes('/timezone'))
    for (const file of timezoneFiles) {
      const name = /pub fn (sql__[a-z0-9_]+)\(/u.exec(file.source)?.[1]
      if (!name) continue
      const assembled = assembleCheckRust({ source: '', callables: [name] })
      expect(assembled.modules.find((module) => module.name === 'pg_catalog')?.files).toEqual(
        source.modules[1]!.files,
      )
    }
  })

  it('omits the timezone group when no requested callable depends on it', () => {
    const assembled = assembleCheckRust({ source: '', callables: [] })
    expect(assembled.modules.find((module) => module.name === 'pg_catalog')?.files).toEqual(
      fixture().modules[1]!.files.filter((file) => !file.path.includes('/timezone')),
    )
  })
})
