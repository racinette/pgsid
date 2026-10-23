import {
  compositeRustInput,
  compositeGoInput,
  compositeTypescriptInput,
  type CompositeInputPayload,
} from './composite-input.js'
import {
  isOidType,
  isRangeType,
  isMultirangeType,
  isArrayLikeType,
} from '../../src/sql-semantics/expressions.js'
import {
  rangeRustInput,
  rangeGoInput,
  rangeTypescriptInput,
  type RangeInputPayload,
} from './range-input.js'
import {
  arrayRustInput,
  arrayGoInput,
  arrayTypescriptInput,
  type OwnedArrayInputPayload,
} from './array-input.js'
import {
  multirangeRustInput,
  multirangeGoInput,
  multirangeTypescriptInput,
  type MultirangeInputPayload,
} from './multirange-input.js'
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
import { enumLabelOid, type EnumDefinition } from '../../src/sql-semantics/expressions.js'
import { go, printGoFile, type GoExpression, type GoStatement } from '../../src/codegen/go/ast.js'

export type Input =
  | {
      kind: 'Value'
      value:
        | number
        | bigint
        | boolean
        | string
        | { closed: boolean; points: { x: bigint; y: bigint }[] }
        | {
            points: { x: bigint; y: bigint }[]
            bounds?: { highX: bigint; highY: bigint; lowX: bigint; lowY: bigint }
          }
        | { x: bigint; y: bigint; radius: bigint }
        | { x: bigint; y: bigint }
        | { a: bigint; b: bigint; c: bigint }
        | { x1: bigint; y1: bigint; x2: bigint; y2: bigint }
        | { highX: bigint; highY: bigint; lowX: bigint; lowY: bigint }
        | { time: bigint; zone: number }
        | { time: bigint; months: number; days: number }
        | RangeInputPayload
        | OwnedArrayInputPayload
        | MultirangeInputPayload
        | CompositeInputPayload
    }
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
    isMultirangeType(type)
      ? 'multirange'
      : isRangeType(type)
        ? 'range'
        : type.startsWith('composite:')
          ? 'composite'
          : isArrayLikeType(type)
            ? 'array'
            : type === 'pg_catalog.xml'
              ? 'xml'
              : type === 'pg_catalog.jsonpath'
                ? 'jsonpath'
                : type === 'pg_catalog.jsonb'
                  ? 'jsonb'
                  : type === 'pg_catalog."json"'
                    ? 'json'
                    : type === 'pg_catalog."char"'
                      ? 'internal_char'
                      : type === 'pg_catalog.xid'
                        ? 'xid'
                        : type === 'pg_catalog.cid'
                          ? 'cid'
                          : type === 'pg_catalog.pg_lsn'
                            ? 'pg_lsn'
                            : type === 'pg_catalog.tid'
                              ? 'tid'
                              : type === 'pg_catalog.xid8'
                                ? 'xid8'
                                : isOidType(type)
                                  ? 'oid'
                                  : type === 'pg_catalog.money'
                                    ? 'money'
                                    : type === 'pg_catalog.polygon'
                                      ? 'polygon'
                                      : type === 'pg_catalog.path'
                                        ? 'path'
                                        : type === 'pg_catalog.circle'
                                          ? 'circle'
                                          : type === 'pg_catalog.box'
                                            ? 'box'
                                            : type === 'pg_catalog.lseg'
                                              ? 'lseg'
                                              : type === 'pg_catalog.line'
                                                ? 'line'
                                                : type === 'pg_catalog.point'
                                                  ? 'point'
                                                  : type === 'pg_catalog."time"'
                                                    ? 'time'
                                                    : type === 'pg_catalog.timetz'
                                                      ? 'timetz'
                                                      : type === 'pg_catalog."interval"'
                                                        ? 'interval'
                                                        : type === 'pg_catalog.float4' ||
                                                            type === 'pg_catalog.float8'
                                                          ? type.slice('pg_catalog.'.length)
                                                          : type === 'pg_catalog."bit"' ||
                                                              type === 'pg_catalog.varbit'
                                                            ? 'bit'
                                                            : type === 'pg_catalog.uuid'
                                                              ? 'uuid'
                                                              : type === 'pg_catalog.inet' ||
                                                                  type === 'pg_catalog.cidr'
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
                                                                          : type ===
                                                                              'pg_catalog.int4'
                                                                            ? 'int4'
                                                                            : type ===
                                                                                'pg_catalog.int8'
                                                                              ? 'int8'
                                                                              : type ===
                                                                                  'pg_catalog."numeric"'
                                                                                ? 'numeric'
                                                                                : type ===
                                                                                    'pg_catalog."timestamp"'
                                                                                  ? 'timestamp'
                                                                                  : type ===
                                                                                      'pg_catalog.timestamptz'
                                                                                    ? 'timestamptz'
                                                                                    : type ===
                                                                                        'pg_catalog.date'
                                                                                      ? 'date'
                                                                                      : type ===
                                                                                          'pg_catalog.bool'
                                                                                        ? 'bool'
                                                                                        : 'text'
  const inputCode = (input: Input, type: string, definition?: EnumDefinition): string => {
    const prefix = prefixOf(type)
    if (input.kind === 'Null' || input.kind === 'Unknown')
      return `${prefix}_${input.kind.toLowerCase()}()`
    if (input.kind === 'Error')
      return `${pascal(prefix)}Value::Error(make_sql_error(${input.value.state}))`
    if (prefix === 'composite') return compositeRustInput(input.value as CompositeInputPayload)
    if (prefix === 'array') return arrayRustInput(input.value as OwnedArrayInputPayload)
    if (prefix === 'multirange') return multirangeRustInput(input.value as MultirangeInputPayload)
    if (prefix === 'range') return rangeRustInput(input.value as RangeInputPayload)
    if (prefix === 'jsonpath')
      return `jsonpath_from_coerced_source_utf8(make_text_value(${rustStringLiteral(input.value as string)}))`
    if (prefix === 'enum' && definition) {
      const oid = enumLabelOid(definition, input.value as number)
      if (oid !== null) return `make_catalog_enum_value(${input.value}, ${oid}i64)`
    }
    if (prefix === 'float4' || prefix === 'float8') {
      const bits = BigInt(input.value as number | bigint)
      const literal =
        prefix === 'float8'
          ? `${bits}i64`
          : bits === -2147483648n
            ? '-2147483647 - 1'
            : String(bits)
      return `make_${prefix}_bits(${literal})`
    }
    if (typeof input.value === 'object') {
      const parts = input.value
      if ('points' in parts) {
        const points = `vec![${parts.points.map((p) => `PointPayload {x: ${p.x}i64, y: ${p.y}i64, wire_known: true}`).join(',')}]`
        if (!('closed' in parts)) {
          const bounds = parts.bounds
            ? inputCode({ kind: 'Value', value: parts.bounds }, 'pg_catalog.box')
            : 'BoxValue::Unknown'
          return `make_polygon_value(PolygonPayload {points: ${points}, bounds: ${bounds}})`
        }
        return `make_path_value(PathPayload {closed: ${parts.closed}, points: ${points}})`
      }
      if ('radius' in parts)
        return `make_circle_bits(${parts.x}i64, ${parts.y}i64, ${parts.radius}i64)`
      if ('highX' in parts)
        return `make_box_bits(${parts.highX}i64, ${parts.highY}i64, ${parts.lowX}i64, ${parts.lowY}i64)`
      if ('x1' in parts)
        return `make_lseg_bits(${parts.x1}i64, ${parts.y1}i64, ${parts.x2}i64, ${parts.y2}i64)`
      if ('x' in parts) return `make_point_bits(${parts.x}i64, ${parts.y}i64)`
      if ('a' in parts) return `make_line_bits(${parts.a}i64, ${parts.b}i64, ${parts.c}i64)`
      if ('bounds' in parts) throw new Error('Range payload requires a range input type')
      if ('dimensions' in parts) throw new Error('Array payload requires an array input type')
      if ('ranges' in parts) throw new Error('Multirange payload requires a multirange input type')
      if ('fields' in parts) throw new Error('Composite payload requires a composite input type')
      const args =
        'zone' in parts
          ? `${parts.time}i64, ${parts.zone}`
          : `${parts.months === -2147483648 ? '-2147483647 - 1' : parts.months}, ${parts.days === -2147483648 ? '-2147483647 - 1' : parts.days}, ${parts.time}i64`
      return `make_${prefix}_value(${args})`
    }
    const literal =
      typeof input.value === 'string'
        ? rustStringLiteral(input.value)
        : prefix === 'time' ||
            prefix === 'xid' ||
            prefix === 'cid' ||
            prefix === 'pg_lsn' ||
            prefix === 'tid' ||
            prefix === 'xid8' ||
            prefix === 'oid' ||
            prefix === 'money' ||
            prefix === 'int8' ||
            prefix === 'timestamp' ||
            prefix === 'timestamptz'
          ? `${input.value}i64`
          : String(input.value)
    if (prefix === 'pg_lsn') return `make_pg_lsn_bits(${literal})`
    if (prefix === 'xid8') return `make_xid8_bits(${literal})`
    return `make_${prefix}_value(${literal})`
  }
  const projectedInput = (input: Input, nullness?: true): Input => {
    if (!nullness || input.kind === 'Unknown' || input.kind === 'Error') return input
    return { kind: 'Value', value: input.kind === 'Null' }
  }
  let goBatchRequiresJsonpath = false
  const goInput = (input: Input, type: string, definition?: EnumDefinition): GoExpression => {
    const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
    const prefix = pascal(prefixOf(type))
    if (prefix === 'Composite' && input.kind === 'Value')
      return compositeGoInput(input.value as CompositeInputPayload)
    if (prefix === 'Range' && input.kind === 'Value')
      return rangeGoInput(input.value as RangeInputPayload)
    if (prefix === 'Array' && input.kind === 'Value')
      return arrayGoInput(input.value as OwnedArrayInputPayload)
    if (prefix === 'Multirange' && input.kind === 'Value')
      return multirangeGoInput(input.value as MultirangeInputPayload)
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
    if (prefix === 'Jsonpath') {
      goBatchRequiresJsonpath = true
      return go.call(go.selector(go.ident('pg_catalog'), 'JsonpathFromCoercedSourceUtf8'), [
        go.call(runtime('MakeTextValue'), [go.string(input.value as string)]),
      ])
    }
    if (prefix === 'Enum' && definition) {
      const oid = enumLabelOid(definition, input.value as number)
      if (oid !== null)
        return go.call(runtime('MakeCatalogEnumValue'), [
          go.number(input.value as number),
          go.number(oid),
        ])
    }
    if (prefix === 'Float4' || prefix === 'Float8')
      return go.call(runtime('Make' + prefix + 'Bits'), [go.number(input.value as number | bigint)])
    if (typeof input.value === 'object') {
      const parts = input.value
      if ('points' in parts && !('closed' in parts)) {
        const points = go.composite(
          go.slice(runtime('PointPayload')),
          parts.points.map((point) =>
            go.composite(runtime('PointPayload'), [
              go.keyValue('X', go.number(point.x)),
              go.keyValue('Y', go.number(point.y)),
              go.keyValue('WireKnown', go.ident('true')),
            ]),
          ),
        )
        const bounds = parts.bounds
          ? goInput({ kind: 'Value', value: parts.bounds }, 'pg_catalog.box')
          : go.call(runtime('BoxUnknown'), [])
        return go.call(runtime('MakePolygonValue'), [
          go.composite(runtime('PolygonPayload'), [
            go.keyValue('Points', points),
            go.keyValue('Bounds', bounds),
          ]),
        ])
      }
      if ('points' in parts)
        return go.call(runtime('MakePathValue'), [
          go.composite(runtime('PathPayload'), [
            go.keyValue('Closed', go.ident(String(parts.closed))),
            go.keyValue(
              'Points',
              go.composite(
                go.slice(runtime('PointPayload')),
                parts.points.map((p) =>
                  go.composite(runtime('PointPayload'), [
                    go.keyValue('X', go.number(p.x)),
                    go.keyValue('Y', go.number(p.y)),
                    go.keyValue('WireKnown', go.ident('true')),
                  ]),
                ),
              ),
            ),
          ]),
        ])
      if ('radius' in parts)
        return go.call(runtime('MakeCircleBits'), [
          go.number(parts.x),
          go.number(parts.y),
          go.number(parts.radius),
        ])
      if ('highX' in parts)
        return go.call(runtime('MakeBoxBits'), [
          go.number(parts.highX),
          go.number(parts.highY),
          go.number(parts.lowX),
          go.number(parts.lowY),
        ])
      if ('x1' in parts)
        return go.call(runtime('MakeLsegBits'), [
          go.number(parts.x1),
          go.number(parts.y1),
          go.number(parts.x2),
          go.number(parts.y2),
        ])
      if ('x' in parts)
        return go.call(runtime('MakePointBits'), [go.number(parts.x), go.number(parts.y)])
      if ('a' in parts)
        return go.call(runtime('MakeLineBits'), [
          go.number(parts.a),
          go.number(parts.b),
          go.number(parts.c),
        ])
      if ('bounds' in parts) throw new Error('Range payload requires a range input type')
      if ('dimensions' in parts) throw new Error('Array payload requires an array input type')
      if ('ranges' in parts) throw new Error('Multirange payload requires a multirange input type')
      if ('fields' in parts) throw new Error('Composite payload requires a composite input type')
      return go.call(
        runtime('Make' + prefix + 'Value'),
        'zone' in parts
          ? [go.number(parts.time), go.number(parts.zone)]
          : [go.number(parts.months), go.number(parts.days), go.number(parts.time)],
      )
    }
    const value =
      typeof input.value === 'string'
        ? go.string(input.value)
        : typeof input.value === 'boolean'
          ? go.ident(String(input.value))
          : go.number(input.value)
    return go.call(
      runtime('Make' + prefix + (prefix === 'Xid8' || prefix === 'PgLsn' ? 'Bits' : 'Value')),
      [value],
    )
  }
  const rustAssertions: string[] = []
  const rustFixtureFunctions: string[] = []
  const goAssertions: GoStatement[] = []
  let goBatchIndex = 0
  await mkdir(join(directory, 'go'), { recursive: true })
  const flushGoAssertions = async (): Promise<void> => {
    if (!goAssertions.length) return
    const index = goBatchIndex++
    let source: string
    try {
      source = printGoFile({
        package: 'parity',
        imports: [
          { path: 'testing' },
          { alias: 'generated', path: moduleName },
          { path: moduleName + '/checkruntime' },
          ...(goBatchRequiresJsonpath ? [{ path: moduleName + '/pg_catalog' }] : []),
        ],
        declarations: [
          go.function(
            'TestChecks' + index,
            [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
            [],
            goAssertions,
          ),
        ],
      })
    } catch (cause) {
      throw new Error(`Render Go parity batch ${index} in ${moduleName}`, { cause })
    }
    const batchDirectory = join(directory, 'go', 'parity', `batch_${Math.floor(index / 20)}`)
    await mkdir(batchDirectory, { recursive: true })
    await writeFile(join(batchDirectory, `checks_${index}_test.go`), source)
    goAssertions.length = 0
    goBatchRequiresJsonpath = false
  }
  for (const [index, fixture] of fixtures.entries()) {
    const check = entries.get(fixture.name)!
    const args = check.inputs
      .map((input) =>
        inputCode(
          projectedInput(fixture.row[input.name]!, input.nullness),
          input.nullness ? 'pg_catalog.bool' : input.type,
          input.enum,
        ),
      )
      .join(', ')
    const rustExpected = `CheckOutcome::${fixture.expected.kind}${fixture.expected.kind === 'Error' ? `(make_sql_error(${fixture.expected.value.state}))` : ''}`
    const rustAssertion = `{let actual=${check.entryName}(${args});let error=match actual {CheckOutcome::Error(error)=>error.state,_=>0};assert!(actual == ${rustExpected}, "${fixture.name} ${index}: unknown={} false={} null={} true={} error={}", actual==CheckOutcome::Unknown,actual==CheckOutcome::False,actual==CheckOutcome::Null,actual==CheckOutcome::True,error);}`
    if (check.inputs.some((input) => input.type.startsWith('composite:'))) {
      const name = `checks_fixture_${index}`
      rustFixtureFunctions.push(`#[inline(never)]\nfn ${name}() {${rustAssertion}}`)
      rustAssertions.push(`${name}();`)
    } else rustAssertions.push(rustAssertion)
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
              go.selector(go.ident('generated'), pascal(check.entryName)),
              check.inputs.map((input) =>
                goInput(
                  projectedInput(fixture.row[input.name]!, input.nullness),
                  input.nullness ? 'pg_catalog.bool' : input.type,
                  input.enum,
                ),
              ),
            ),
          ],
        ),
      ),
    )
    if (goAssertions.length === 250) await flushGoAssertions()
  }
  await flushGoAssertions()
  const batches = (assertions: readonly string[]): string[] => {
    const result: string[] = []
    for (let index = 0; index < assertions.length; index += 250)
      result.push(assertions.slice(index, index + 250).join('\n'))
    return result
  }
  await writeFile(
    join(directory, 'checks_test.rs'),
    `include!("checks.rs");\n${rustFixtureFunctions.join('\n')}\n${batches(rustAssertions)
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
  await run('go', ['test', '-p', '1', './...'], {
    cwd: join(directory, 'go'),
    env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
  })
  for (const artifact of checkTypescriptArtifacts(split.typescript)) {
    const path = join(directory, 'typescript', artifact.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, artifact.content)
  }
  await run(process.execPath, [
    'node_modules/typescript/bin/tsc',
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
  ]).catch((error: { stdout: string; stderr: string }) => {
    throw new Error(error.stdout + error.stderr, { cause: error })
  })
  const generated = await import(pathToFileURL(join(directory, 'typescript/checks.ts')).href)
  const operations = await import(
    pathToFileURL(join(directory, 'typescript/pg_catalog/operations.ts')).href
  )
  for (const fixture of fixtures) {
    const check = entries.get(fixture.name)!
    const result = generated[camel(check.entryName)](
      ...check.inputs.map((input) => {
        const value = projectedInput(fixture.row[input.name]!, input.nullness)
        if (input.nullness) return value
        if (input.type.startsWith('composite:') && value.kind === 'Value')
          return generated.makeCompositeValue(
            compositeTypescriptInput(value.value as CompositeInputPayload, generated),
          )
        if (isRangeType(input.type) && value.kind === 'Value')
          return generated.makeCoercedRangeValue(
            rangeTypescriptInput(value.value as RangeInputPayload, generated),
          )
        if (isMultirangeType(input.type) && value.kind === 'Value')
          return generated.makeCoercedMultirangeValue(
            multirangeTypescriptInput(value.value as MultirangeInputPayload, generated),
          )
        if (isArrayLikeType(input.type) && value.kind === 'Value')
          return generated.makeArrayValue(
            arrayTypescriptInput(value.value as OwnedArrayInputPayload, generated),
          )
        if (input.type === 'pg_catalog.jsonpath' && value.kind === 'Value')
          return operations.jsonpathFromCoercedSourceUtf8(generated.makeTextValue(value.value))
        if (input.type === 'pg_catalog.xml' && value.kind === 'Value')
          return generated.makeXmlValue(value.value)
        if (input.type === 'pg_catalog.jsonb' && value.kind === 'Value')
          return generated.makeJsonbValue(value.value)
        if (input.type === 'pg_catalog."json"' && value.kind === 'Value')
          return generated.makeJsonValue(value.value)
        if (input.type.startsWith('enum:') && value.kind === 'Value') {
          const oid = input.enum ? enumLabelOid(input.enum, value.value as number) : null
          return oid === null
            ? generated.makeEnumValue(value.value)
            : generated.makeCatalogEnumValue(value.value, BigInt(oid))
        }
        if (
          (input.type === 'pg_catalog.inet' || input.type === 'pg_catalog.cidr') &&
          value.kind === 'Value'
        )
          return generated.makeNetworkValue(value.value)
        if (input.type === 'pg_catalog.xid' && value.kind === 'Value')
          return generated.makeXidValue(BigInt(value.value as number | bigint))
        if (input.type === 'pg_catalog.cid' && value.kind === 'Value')
          return generated.makeCidValue(BigInt(value.value as number | bigint))
        if (input.type === 'pg_catalog.pg_lsn' && value.kind === 'Value')
          return generated.makePgLsnBits(BigInt(value.value as number | bigint))
        if (input.type === 'pg_catalog."char"' && value.kind === 'Value')
          return generated.makeInternalCharValue(Number(value.value))
        if (input.type === 'pg_catalog.tid' && value.kind === 'Value')
          return generated.makeTidValue(BigInt(value.value as number | bigint))
        if (input.type === 'pg_catalog.xid8' && value.kind === 'Value')
          return generated.makeXid8Bits(BigInt(value.value as number | bigint))
        if (isOidType(input.type) && value.kind === 'Value')
          return generated.makeOidValue(BigInt(value.value as number | bigint))
        if (input.type === 'pg_catalog.money' && value.kind === 'Value')
          return generated.makeMoneyValue(BigInt(value.value as number | bigint))
        if (input.type === 'pg_catalog.float4' && value.kind === 'Value')
          return generated.makeFloat4Bits(Number(value.value))
        if (input.type === 'pg_catalog.float8' && value.kind === 'Value')
          return generated.makeFloat8Bits(BigInt(value.value as number | bigint))
        if (
          input.type === 'pg_catalog.path' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'points' in value.value &&
          'closed' in value.value
        )
          return generated.makePathValue({
            closed: value.value.closed,
            points: value.value.points.map((p) => ({ ...p, wireKnown: true })),
          })
        if (
          input.type === 'pg_catalog.polygon' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'points' in value.value &&
          !('closed' in value.value)
        )
          return generated.makePolygonValue({
            points: value.value.points.map((p) => ({ ...p, wireKnown: true })),
            bounds: value.value.bounds
              ? generated.makeBoxBits(
                  value.value.bounds.highX,
                  value.value.bounds.highY,
                  value.value.bounds.lowX,
                  value.value.bounds.lowY,
                )
              : { kind: 'Unknown' },
          })
        if (
          input.type === 'pg_catalog.circle' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'radius' in value.value
        )
          return generated.makeCircleBits(value.value.x, value.value.y, value.value.radius)
        if (
          input.type === 'pg_catalog.point' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'x' in value.value
        )
          return generated.makePointBits(value.value.x, value.value.y)
        if (
          input.type === 'pg_catalog.box' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'highX' in value.value
        )
          return generated.makeBoxBits(
            value.value.highX,
            value.value.highY,
            value.value.lowX,
            value.value.lowY,
          )
        if (
          input.type === 'pg_catalog.lseg' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'x1' in value.value
        )
          return generated.makeLsegBits(
            value.value.x1,
            value.value.y1,
            value.value.x2,
            value.value.y2,
          )
        if (
          input.type === 'pg_catalog.line' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'a' in value.value
        )
          return generated.makeLineBits(value.value.a, value.value.b, value.value.c)
        if (input.type === 'pg_catalog."time"' && value.kind === 'Value')
          return generated.makeTimeValue(value.value)
        if (
          input.type === 'pg_catalog.timetz' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'zone' in value.value
        )
          return generated.makeTimetzValue(value.value.time, value.value.zone)
        if (
          input.type === 'pg_catalog."interval"' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'months' in value.value
        )
          return generated.makeIntervalValue(value.value.months, value.value.days, value.value.time)
        if (input.type === 'pg_catalog.uuid' && value.kind === 'Value')
          return generated.makeUuidValue(value.value)
        if (input.type === 'pg_catalog.macaddr' && value.kind === 'Value')
          return generated.makeMacaddrValue(value.value)
        if (input.type === 'pg_catalog.macaddr8' && value.kind === 'Value')
          return generated.makeMacaddr8Value(value.value)
        if (
          (input.type === 'pg_catalog."bit"' || input.type === 'pg_catalog.varbit') &&
          value.kind === 'Value'
        )
          return generated.makeBitValue(value.value)
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
