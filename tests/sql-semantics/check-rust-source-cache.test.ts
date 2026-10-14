import { describe, expect, it } from 'vitest'
import { createCheckRustSourceCache } from '../../src/codegen/shared/check-rust-source-cache.js'
import type { CheckRustSource } from '../../src/codegen/shared/check-rust-source.js'

const fixture = (name: string): CheckRustSource => ({
  schemaVersion: 1,
  modules: [
    {
      name: 'pg_catalog',
      dependencies: ['checkruntime'],
      files: [
        { path: 'operations/example.rs', source: `pub fn sql__pg_catalog__${name}__test() {}` },
      ],
    },
  ],
})

describe('CHECK source asset cache', () => {
  it('parses identical bytes once while returning independent editable graphs and callable sets', () => {
    const original = fixture('first')
    const text = JSON.stringify(original)
    let parses = 0
    const cache = createCheckRustSourceCache(
      () => Buffer.from(text),
      (text) => {
        parses++
        return JSON.parse(text) as CheckRustSource
      },
    )
    const first = cache.source()
    expect(first).toEqual(original)
    first.modules[0]!.name = 'changed'
    first.modules[0]!.dependencies.push('changed')
    first.modules[0]!.files[0]!.source = 'changed'
    first.modules[0]!.files.push({ path: 'changed', source: 'changed' })
    cache.callables().clear()
    expect(cache.source()).toEqual(original)
    expect([...cache.callables()]).toEqual(['sql__pg_catalog__first__test'])
    expect(parses).toBe(1)
  })

  it('refreshes same-length changes even when a loader reuses and mutates its buffer', () => {
    const bytes = Buffer.from(JSON.stringify(fixture('first')))
    let parses = 0
    const cache = createCheckRustSourceCache(
      () => bytes,
      (text) => {
        parses++
        return JSON.parse(text) as CheckRustSource
      },
    )
    const previous = cache.source()
    const next = Buffer.from(JSON.stringify(fixture('other')))
    expect(next.length).toBe(bytes.length)
    next.copy(bytes)
    expect(cache.source()).toEqual(fixture('other'))
    expect([...cache.callables()]).toEqual(['sql__pg_catalog__other__test'])
    expect(previous).toEqual(fixture('first'))
    expect(parses).toBe(2)
  })

  it('does not publish a stale or partial model after malformed asset bytes', () => {
    let bytes = Buffer.from(JSON.stringify(fixture('first')))
    const cache = createCheckRustSourceCache(() => bytes)
    const previous = cache.source()
    bytes = Buffer.from('{')
    expect(() => cache.source()).toThrow(SyntaxError)
    expect(() => cache.callables()).toThrow(SyntaxError)
    bytes = Buffer.from(JSON.stringify(fixture('other')))
    expect(cache.source()).toEqual(fixture('other'))
    expect(previous).toEqual(fixture('first'))
  })
})
