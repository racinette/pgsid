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
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { go, printGoFile, type GoExpression, type GoStatement } from '../../src/codegen/go/ast.js'

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
  const prefixOf = (type: string): string =>
    type === 'pg_catalog.uuid'
      ? 'uuid'
      : type === 'pg_catalog.inet' || type === 'pg_catalog.cidr'
        ? 'network'
        : type === 'pg_catalog.macaddr'
          ? 'macaddr'
          : type === 'pg_catalog.macaddr8'
            ? 'macaddr8'
            : type === 'pg_catalog.bytea'
              ? 'bytea'
              : type.startsWith('enum:')
                ? 'enum'
                : type === 'pg_catalog.int2'
                  ? 'int2'
                  : type === 'pg_catalog.int4'
                    ? 'int4'
                    : type === 'pg_catalog.int8'
                      ? 'int8'
                      : type === 'pg_catalog."numeric"'
                        ? 'numeric'
                        : type === 'pg_catalog."timestamp"'
                          ? 'timestamp'
                          : type === 'pg_catalog.timestamptz'
                            ? 'timestamptz'
                            : type === 'pg_catalog.date'
                              ? 'date'
                              : type === 'pg_catalog.bool'
                                ? 'bool'
                                : 'text'
  const inputCode = (input: Input, type: string): string => {
    const prefix = prefixOf(type)
    if (input.kind === 'Null' || input.kind === 'Unknown')
      return `${prefix}_${input.kind.toLowerCase()}()`
    if (input.kind === 'Error')
      return `${pascal(prefix)}Value::Error(make_sql_error(${input.value.state}))`
    const literal =
      typeof input.value === 'string'
        ? rustStringLiteral(input.value)
        : prefix === 'int8' || prefix === 'timestamp' || prefix === 'timestamptz'
          ? `${input.value}i64`
          : String(input.value)
    return `make_${prefix}_value(${literal})`
  }
  const projectedInput = (input: Input, nullness?: true): Input => {
    if (!nullness || input.kind === 'Unknown' || input.kind === 'Error') return input
    return { kind: 'Value', value: input.kind === 'Null' }
  }
  const goInput = (input: Input, type: string): GoExpression => {
    const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
    const prefix = pascal(prefixOf(type))
    if (input.kind === 'Null' || input.kind === 'Unknown')
      return go.call(runtime(prefix + input.kind), [])
    if (input.kind === 'Error')
      return go.composite(runtime(prefix + 'Value'), [
        go.keyValue('Kind', runtime(prefix + 'ValueError')),
        go.keyValue(
          'Error',
          go.composite(runtime('SqlError'), [go.keyValue('State', go.number(input.value.state))]),
        ),
      ])
    const value =
      typeof input.value === 'string'
        ? go.string(input.value)
        : typeof input.value === 'boolean'
          ? go.ident(String(input.value))
          : go.number(input.value)
    return go.call(runtime('Make' + prefix + 'Value'), [value])
  }
  const rustAssertions: string[] = []
  const goAssertions: GoStatement[] = []
  for (const [index, fixture] of fixtures.entries()) {
    const check = entries.get(fixture.name)!
    const args = check.inputs
      .map((input) =>
        inputCode(
          projectedInput(fixture.row[input.name]!, input.nullness),
          input.nullness ? 'pg_catalog.bool' : input.type,
        ),
      )
      .join(', ')
    const rustExpected = `CheckOutcome::${fixture.expected.kind}${fixture.expected.kind === 'Error' ? `(make_sql_error(${fixture.expected.value.state}))` : ''}`
    rustAssertions.push(
      `assert!(${check.entryName}(${args}) == ${rustExpected}, "${fixture.name} ${index}");`,
    )
    const goExpected = go.composite(go.selector(go.ident('checkruntime'), 'CheckOutcome'), [
      go.keyValue(
        'Kind',
        go.selector(go.ident('checkruntime'), 'CheckOutcome' + fixture.expected.kind),
      ),
      ...(fixture.expected.kind === 'Error'
        ? [
            go.keyValue(
              'Error',
              go.composite(go.selector(go.ident('checkruntime'), 'SqlError'), [
                go.keyValue('State', go.number(fixture.expected.value.state)),
              ]),
            ),
          ]
        : []),
    ])
    const actual = go.ident('actual')
    const expected = go.ident('expected' + index)
    goAssertions.push(
      go.assign([expected], [goExpected]),
      go.if(
        go.notEqual(actual, expected),
        [
          go.expression(
            go.call(go.selector(go.ident('t'), 'Fatalf'), [
              go.string(`${fixture.name} ${index}: %+v`),
              actual,
            ]),
          ),
        ],
        go.assign(
          [actual],
          [
            go.call(
              go.ident(pascal(check.entryName)),
              check.inputs.map((input) =>
                goInput(
                  projectedInput(fixture.row[input.name]!, input.nullness),
                  input.nullness ? 'pg_catalog.bool' : input.type,
                ),
              ),
            ),
          ],
        ),
      ),
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
  await run(join(directory, 'rust-test'), []).catch((error: { stdout: string; stderr: string }) => {
    throw new Error(error.stdout + error.stderr, { cause: error })
  })
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
    printGoFile({
      package: 'generated',
      imports: [{ path: 'testing' }, { path: moduleName + '/checkruntime' }],
      declarations: Array.from({ length: Math.ceil(goAssertions.length / 250) }, (_, index) =>
        go.function(
          'TestChecks' + index,
          [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
          [],
          goAssertions.slice(index * 250, (index + 1) * 250),
        ),
      ),
    }),
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
      ...check.inputs.map((input) => {
        const value = projectedInput(fixture.row[input.name]!, input.nullness)
        if (input.nullness) return value
        if (
          (input.type === 'pg_catalog.inet' || input.type === 'pg_catalog.cidr') &&
          value.kind === 'Value'
        )
          return generated.makeNetworkValue(value.value)
        if (input.type === 'pg_catalog.uuid' && value.kind === 'Value')
          return generated.makeUuidValue(value.value)
        if (input.type === 'pg_catalog.macaddr' && value.kind === 'Value')
          return generated.makeMacaddrValue(value.value)
        if (input.type === 'pg_catalog.macaddr8' && value.kind === 'Value')
          return generated.makeMacaddr8Value(value.value)
        if (input.type === 'pg_catalog.bytea' && value.kind === 'Value')
          return generated.makeByteaValue(value.value)
        if (input.type === 'pg_catalog.int2' && value.kind === 'Value')
          return generated.makeInt2Value(value.value)
        if (input.type === 'pg_catalog."numeric"' && value.kind === 'Value')
          return generated.makeNumericValue(value.value)
        if (input.type === 'pg_catalog."timestamp"' && value.kind === 'Value')
          return generated.makeTimestampValue(value.value)
        return input.type === 'pg_catalog.timestamptz' && value.kind === 'Value'
          ? generated.makeTimestamptzValue(value.value)
          : value
      }),
    )
    assert.deepEqual(
      result,
      fixture.expected,
      `${fixture.name}: ${JSON.stringify(fixture.row, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))}`,
    )
  }
}
