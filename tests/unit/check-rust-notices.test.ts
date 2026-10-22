import { expect, it } from 'vitest'
import {
  transpileCheckRust,
  transpileCheckRustFiles,
} from '../../src/codegen/shared/check-rust-transpile.js'
import type { CheckRustSource } from '../../src/codegen/shared/check-rust-source.js'

it('preserves leading copyright and license notices in combined target sources', () => {
  const notice = '/* Copyright example. Permission to use this software. */'
  const source = `${notice}\n// SPDX-License-Identifier: MIT\npub fn answer()->i32 {42}`
  const generated = transpileCheckRust(source)
  for (const output of [generated.go, generated.typescript]) {
    expect(output.startsWith(notice + '\n// SPDX-License-Identifier: MIT\n')).toBe(true)
    expect(output.match(/Copyright example/gu)).toHaveLength(1)
  }
})

it('keeps source notices with their owning modules and deduplicates repeated headers', () => {
  const source: CheckRustSource = {
    schemaVersion: 1,
    modules: [
      {
        name: 'regex_engine',
        dependencies: [],
        files: [
          {
            path: 'regex.rs',
            source: '/* Copyright regex owner. */\npub fn regex_probe()->i32 {1}',
          },
        ],
      },
      {
        name: 'checkruntime',
        dependencies: [],
        files: [
          {
            path: 'runtime.rs',
            source: '// Copyright runtime owner.\npub fn runtime_probe()->i32 {2}',
          },
        ],
      },
      {
        name: 'pg_catalog',
        dependencies: ['checkruntime'],
        files: [
          {
            path: 'operations.rs',
            source:
              '/* Copyright operations owner. */\npub fn operation_probe()->i32 {runtime_probe()}',
          },
          {
            path: 'extra.rs',
            source: '/* Copyright operations owner. */\npub fn second_probe()->i32 {3}',
          },
        ],
      },
      {
        name: 'checks',
        dependencies: ['pg_catalog', 'regex_engine'],
        files: [
          {
            path: 'checks.rs',
            source:
              '// SPDX-License-Identifier: MIT\n// Copyright checks owner.\npub fn evaluate_check()->i32 {operation_probe()+regex_probe()}',
          },
        ],
      },
    ],
  }
  const split = transpileCheckRustFiles(source)
  for (const target of [split.go, split.typescript]) {
    for (const part of ['regex', 'runtime', 'operations', 'checks'] as const) {
      expect(target[part]).toContain('Copyright ' + part + ' owner.')
      expect(target[part].match(/Copyright/gu)).toHaveLength(1)
      for (const other of ['regex', 'runtime', 'operations', 'checks'])
        if (part !== other) expect(target[part]).not.toContain('Copyright ' + other + ' owner.')
    }
    expect(target.language).not.toContain('Copyright')
  }
})
