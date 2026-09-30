import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import type { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  checkTypescriptArtifacts,
  transpileCheckRustFiles,
} from '../../src/codegen/shared/check-rust-transpile.js'
import { writeCheckRustSources } from './sources.js'

export type Input =
  | { kind: 'Value'; value: number | bigint | boolean | string }
  | { kind: 'Null' }
  | { kind: 'Unknown' }
  | { kind: 'Error'; value: { state: number } }
export type Row = Record<string, Input>
export type Outcome =
  { kind: 'True' | 'False' | 'Null' | 'Unknown' } | { kind: 'Error'; value: { state: number } }

export async function runCheckParity(
  directory: string,
  moduleName: string,
  group: ReturnType<typeof prepareCheckRustGroup>,
  names: readonly string[],
  fixtures: readonly { name: string; row: Row; expected: Outcome }[],
): Promise<void> {
  const run = promisify(execFile)
  assert.ok(group.source && group.evaluatorSource)
  await writeFile(join(directory, 'evaluators.rs'), group.evaluatorSource)
  writeCheckRustSources(join(directory, 'checks.rs'), group.source)
  await run('cargo', [
    'run',
    '--quiet',
    '--locked',
    '--manifest-path',
    'tools/check-rust-dialect/Cargo.toml',
    '--',
    join(directory, 'evaluators.rs'),
  ])
  const entries = new Map(
    names.map((name, index) => {
      const check = group.checks[index]!
      assert.equal(check.kind, 'supported')
      if (check.kind !== 'supported') throw new Error('Unsupported case')
      return [name, check]
    }),
  )
  const pascal = (name: string) =>
    name
      .split('_')
      .map((part) => part[0]!.toUpperCase() + part.slice(1))
      .join('')
  const camel = (name: string) => {
    const result = pascal(name)
    return result[0]!.toLowerCase() + result.slice(1)
  }
  const inputCode = (input: Input, type: string, target: 'rust' | 'go'): string => {
    const prefix =
      type === 'pg_catalog.int4'
        ? 'int4'
        : type === 'pg_catalog.int8'
          ? 'int8'
          : type === 'pg_catalog.bool'
            ? 'bool'
            : 'text'
    if (target === 'rust') {
      if (input.kind === 'Null' || input.kind === 'Unknown')
        return `${prefix}_${input.kind.toLowerCase()}()`
      if (input.kind === 'Error')
        return `${pascal(prefix)}Value::Error(make_sql_error(${input.value.state}))`
      return `make_${prefix}_value(${prefix === 'int8' ? `${input.value}i64` : typeof input.value === 'bigint' ? input.value.toString() : JSON.stringify(input.value)})`
    }
    if (input.kind === 'Null' || input.kind === 'Unknown') return `${pascal(prefix)}${input.kind}()`
    if (input.kind === 'Error')
      return `${pascal(prefix)}Value{Kind: ${pascal(prefix)}ValueError, Error: SqlError{State: ${input.value.state}}}`
    return `Make${pascal(prefix)}Value(${typeof input.value === 'bigint' ? input.value.toString() : JSON.stringify(input.value)})`
  }
  const rustAssertions: string[] = []
  const goAssertions: string[] = []
  for (const [index, fixture] of fixtures.entries()) {
    const check = entries.get(fixture.name)!
    const args = (target: 'rust' | 'go') =>
      check.inputs
        .map((input) => inputCode(fixture.row[input.name]!, input.type, target))
        .join(', ')
    const rustExpected = `CheckOutcome::${fixture.expected.kind}${fixture.expected.kind === 'Error' ? `(make_sql_error(${fixture.expected.value.state}))` : ''}`
    rustAssertions.push(
      `assert!(${check.entryName}(${args('rust')}) == ${rustExpected}, "${fixture.name} ${index}");`,
    )
    const goExpected = `CheckOutcome{Kind: CheckOutcome${fixture.expected.kind}${fixture.expected.kind === 'Error' ? `, Error: SqlError{State: ${fixture.expected.value.state}}` : ''}}`
    goAssertions.push(
      `if actual := ${pascal(check.entryName)}(${args('go')}); actual != (${goExpected}) { t.Fatalf("${fixture.name} ${index}: %+v", actual) }`,
    )
  }
  const batches = (assertions: readonly string[]): string[] => {
    const result: string[] = []
    for (let index = 0; index < assertions.length; index += 250)
      result.push(assertions.slice(index, index + 250).join('\n'))
    return result
  }
  await writeFile(
    join(directory, 'checks_test.rs'),
    `include!("checks.rs");\n${batches(rustAssertions)
      .map((batch, index) => `#[test]\nfn checks_match_postgres_${index}() {\n${batch}\n}`)
      .join('\n')}\n`,
  )
  await run('rustc', [
    '--edition',
    '2021',
    '-Awarnings',
    '--test',
    join(directory, 'checks_test.rs'),
    '-o',
    join(directory, 'rust-test'),
  ])
  await run(join(directory, 'rust-test'), [])
  const split = transpileCheckRustFiles(group.source, `${moduleName}/pg_catalog`)
  for (const [name, source] of Object.entries(split.go)) {
    if (!source) continue
    const path = join(
      directory,
      'go',
      name === 'checks'
        ? 'checks.go'
        : name === 'runtime'
          ? 'checkruntime/runtime.go'
          : name === 'language'
            ? 'langruntime/runtime.go'
            : name === 'regex'
              ? 'regexengine/regex.go'
              : 'pg_catalog/operations.go',
    )
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, source)
  }
  await writeFile(join(directory, 'go/go.mod'), `module ${moduleName}\n\ngo 1.25\n`)
  await writeFile(
    join(directory, 'go/checks_test.go'),
    `package generated\nimport ("testing"; . "${moduleName}/checkruntime")\n${batches(goAssertions)
      .map((batch, index) => `func TestChecks${index}(t *testing.T) {\n${batch}\n}`)
      .join('\n')}\n`,
  )
  await run('go', ['test', './...'], {
    cwd: join(directory, 'go'),
    env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
  })
  for (const artifact of checkTypescriptArtifacts(split.typescript)) {
    const path = join(directory, 'typescript', artifact.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, artifact.content)
  }
  await run('node_modules/.bin/tsc', [
    '--strict',
    '--noEmit',
    '--skipLibCheck',
    '--target',
    'es2022',
    '--module',
    'esnext',
    '--moduleResolution',
    'bundler',
    join(directory, 'typescript/checks.ts'),
  ])
  const generated = await import(pathToFileURL(join(directory, 'typescript/checks.ts')).href)
  for (const fixture of fixtures) {
    const check = entries.get(fixture.name)!
    const result = generated[camel(check.entryName)](
      ...check.inputs.map((input) => fixture.row[input.name]!),
    )
    assert.deepEqual(
      result,
      fixture.expected,
      `${fixture.name}: ${JSON.stringify(fixture.row, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))}`,
    )
  }
}
