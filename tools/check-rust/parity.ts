import { tsqueryRustPayload, tsqueryGoPayload, type TsqueryInputPayload } from './tsquery-input.js'
import {
  tsvectorRustPayload,
  tsvectorGoPayload,
  type TsvectorInputPayload,
} from './tsvector-input.js'
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
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import type { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  checkTypescriptArtifacts,
  transpileCheckRustFiles,
} from '../../src/codegen/shared/check-rust-transpile.js'
import { writeCheckRustSources } from './sources.js'
import { checkRustRuntimeLibrary, linkedCheckRustRoot } from './rust-runtime.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { enumLabelOid, type EnumDefinition } from '../../src/sql-semantics/expressions.js'
import { go, printGoFile, type GoExpression, type GoStatement } from '../../src/codegen/go/ast.js'
import { goFixtureBinding } from './go-fixtures.js'
import { checkGoCacheDirectory } from './go-cache.js'

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
        | TsvectorInputPayload
        | TsqueryInputPayload
        | { grantee: bigint; grantor: bigint; privileges: bigint; grantOptions: bigint }
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
// Above this many fixtures, inline assertions make rustc and the Go toolchain spend
// minutes per suite; value tables keep generated code proportional to distinct values.
const DATA_DRIVEN_FIXTURES = 20000
// Every suite writes its Go code under one module path: the build cache keys packages by import
// path and content (paths are trimmed), so suites sharing a runtime reuse its compiled packages,
// while each suite keeps its own directory.
const goParityModule = 'pgsidparity'
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
  const runtimeLibrary = await checkRustRuntimeLibrary(group.source)
  await writeFile(join(directory, 'checks.rs'), linkedCheckRustRoot(group.source) + '\n')
  const split = transpileCheckRustFiles(group.source, `${goParityModule}/pg_catalog`)
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
    type === 'pg_catalog.tsquery'
      ? 'tsquery'
      : type === 'pg_catalog.tsvector'
        ? 'tsvector'
        : type === 'pg_catalog.aclitem'
          ? 'aclitem'
          : isMultirangeType(type)
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
                                                                      : type ===
                                                                          'pg_catalog.macaddr'
                                                                        ? 'macaddr'
                                                                        : type ===
                                                                            'pg_catalog.macaddr8'
                                                                          ? 'macaddr8'
                                                                          : type ===
                                                                              'pg_catalog.bytea'
                                                                            ? 'bytea'
                                                                            : type.startsWith(
                                                                                  'enum:',
                                                                                )
                                                                              ? 'enum'
                                                                              : type ===
                                                                                  'pg_catalog.int2'
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
      if ('lexemes' in parts) return `make_tsvector_value(${tsvectorRustPayload(parts)})`
      if ('nodes' in parts) return `make_tsquery_value(${tsqueryRustPayload(parts)})`
      if ('grantee' in parts)
        return `make_aclitem_value(${parts.grantee}i64,${parts.grantor}i64,${parts.privileges}i64,${parts.grantOptions}i64)`
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
    if (prefix === 'date') return `make_stored_date_value(${literal})`
    if (prefix === 'timestamp' || prefix === 'timestamptz')
      return `make_stored_${prefix}_value(${literal})`
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
      if ('lexemes' in parts)
        return go.call(runtime('MakeTsvectorValue'), [tsvectorGoPayload(parts)])
      if ('nodes' in parts) return go.call(runtime('MakeTsqueryValue'), [tsqueryGoPayload(parts)])
      if ('grantee' in parts)
        return go.call(runtime('MakeAclitemValue'), [
          go.number(parts.grantee),
          go.number(parts.grantor),
          go.number(parts.privileges),
          go.number(parts.grantOptions),
        ])
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
      runtime(
        ['Date', 'Timestamp', 'Timestamptz'].includes(prefix)
          ? 'MakeStored' + prefix + 'Value'
          : 'Make' + prefix + (prefix === 'Xid8' || prefix === 'PgLsn' ? 'Bits' : 'Value'),
      ),
      [value],
    )
  }
  const rustAssertions: string[] = []
  const rustFixtureFunctions: string[] = []
  const goAssertions: GoStatement[] = []
  let goBatchIndex = 0
  let goAssertionBytes = 0
  let goBatchFixtures = 0
  await mkdir(join(directory, 'go'), { recursive: true })
  const dataDrivenSetting = process.env['PGSID_PARITY_DATA_DRIVEN']
  const dataDriven =
    dataDrivenSetting === 'always' ||
    (dataDrivenSetting !== 'never' && fixtures.length >= DATA_DRIVEN_FIXTURES)

  const flushGoAssertions = async (): Promise<void> => {
    if (!goAssertions.length) return
    const index = goBatchIndex++
    let source: string
    try {
      source = printGoFile({
        package: 'parity',
        imports: [
          { path: 'testing' },
          { alias: 'generated', path: goParityModule },
          { path: goParityModule + '/checkruntime' },
          ...(goBatchRequiresJsonpath ? [{ path: goParityModule + '/pg_catalog' }] : []),
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
      throw new Error(
        `Render Go parity batch ${index} in ${moduleName} (${goAssertions.length} statements, ${goAssertionBytes} bytes)`,
        { cause },
      )
    }
    const batchDirectory = join(directory, 'go', 'parity', `batch_${Math.floor(index / 20)}`)
    await mkdir(batchDirectory, { recursive: true })
    await writeFile(join(batchDirectory, `checks_${index}_test.go`), source)
    goAssertions.length = 0
    goAssertionBytes = 0
    goBatchFixtures = 0
    goBatchRequiresJsonpath = false
  }
  const writeDataDrivenFixtures = async (): Promise<void> => {
    const complexPrefixes = new Set([
      'composite',
      'array',
      'range',
      'multirange',
      'tsvector',
      'tsquery',
      'polygon',
      'path',
    ])
    const tables = new Map<
      string,
      { rust: string[]; go: GoExpression[]; index: Map<string, number>; jsonpath: boolean }
    >()
    const valueIndex = (input: Input, type: string, definition?: EnumDefinition): number => {
      const prefix = prefixOf(type)
      let table = tables.get(prefix)
      if (!table) {
        table = { rust: [], go: [], index: new Map(), jsonpath: false }
        tables.set(prefix, table)
      }
      const rust = inputCode(input, type, definition)
      const known = table.index.get(rust)
      if (known !== undefined) return known
      goBatchRequiresJsonpath = false
      const goValue = goInput(input, type, definition)
      if (goBatchRequiresJsonpath) table.jsonpath = true
      table.index.set(rust, table.rust.length)
      table.rust.push(rust)
      table.go.push(goValue)
      return table.rust.length - 1
    }
    const checkNames = [...entries.keys()]
    const checkIndex = new Map(checkNames.map((name, index) => [name, index]))
    const outcomeCode = (outcome: Outcome): string =>
      outcome.kind === 'Error' ? `E${outcome.value.state}` : outcome.kind[0]!
    const caseLines: string[] = []
    for (const [index, fixture] of fixtures.entries()) {
      const check = entries.get(fixture.name)!
      const args = check.inputs.map((input) =>
        valueIndex(
          projectedInput(fixture.row[input.name]!, input.nullness),
          input.nullness ? 'pg_catalog.bool' : input.type,
          input.enum,
        ),
      )
      caseLines.push(
        `${checkIndex.get(fixture.name)} ${index} ${outcomeCode(fixture.expected)} ${args.join(',')}`,
      )
    }
    const casesPath = resolve(directory, 'parity-cases.txt')
    await writeFile(casesPath, caseLines.join('\n') + '\n')
    const argumentPrefixes = (name: string) =>
      entries
        .get(name)!
        .inputs.map((input) => prefixOf(input.nullness ? 'pg_catalog.bool' : input.type))
    const rustType = (prefix: string) => `${pascal(prefix)}Value`
    const rustTables = [...tables.entries()].map(([prefix, table]) => {
      const complex = complexPrefixes.has(prefix)
      const constructors = complex
        ? table.rust.map(
            (code, index) =>
              `#[inline(never)]\nfn parity_${prefix}_${index}() -> ${rustType(prefix)} {${code}}`,
          )
        : []
      const elements = complex
        ? table.rust.map((_, index) => `parity_${prefix}_${index}()`)
        : table.rust
      return `${constructors.join('\n')}\nfn parity_table_${prefix}() -> Vec<${rustType(prefix)}> {vec![\n${elements.join(',\n')}\n]}`
    })
    const rustRunners = checkNames.map((name, index) => {
      const args = argumentPrefixes(name).map(
        (prefix, position) => `t.${prefix}_values[a[${position}]].clone()`,
      )
      return `fn parity_run_${index}(t: &ParityTables, a: &[usize]) -> CheckOutcome {${entries.get(name)!.entryName}(${args.join(', ')})}`
    })
    await writeFile(
      join(directory, 'checks_test.rs'),
      `include!("checks.rs");
${rustTables.join('\n')}
struct ParityTables {${[...tables.keys()].map((prefix) => `${prefix}_values: Vec<${rustType(prefix)}>`).join(', ')}}
${rustRunners.join('\n')}
#[test]
fn checks_match_postgres() {
    let t = ParityTables {${[...tables.keys()].map((prefix) => `${prefix}_values: parity_table_${prefix}()`).join(', ')}};
    let runners: Vec<fn(&ParityTables, &[usize]) -> CheckOutcome> = vec![${checkNames.map((_, index) => `parity_run_${index}`).join(', ')}];
    let names: Vec<&str> = vec![${checkNames.map((name) => rustStringLiteral(name)).join(', ')}];
    let cases = std::fs::read_to_string(${rustStringLiteral(casesPath)}).unwrap();
    let mut mismatches: Vec<String> = Vec::new();
    let mut count = 0usize;
    for line in cases.lines() {
        let mut parts = line.split(' ');
        let check: usize = parts.next().unwrap().parse().unwrap();
        let fixture = parts.next().unwrap();
        let expected = parts.next().unwrap();
        let args: Vec<usize> = parts
            .next()
            .filter(|list| !list.is_empty())
            .map(|list| list.split(',').map(|item| item.parse().unwrap()).collect())
            .unwrap_or_default();
        count += 1;
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| runners[check](&t, &args)));
        let actual = match result {
            Ok(CheckOutcome::True) => "T".to_string(),
            Ok(CheckOutcome::False) => "F".to_string(),
            Ok(CheckOutcome::Null) => "N".to_string(),
            Ok(CheckOutcome::Unknown) => "U".to_string(),
            Ok(CheckOutcome::Error(error)) => format!("E{}", error.state),
            Err(_) => "panic".to_string(),
        };
        if actual != expected {
            mismatches.push(format!("{} {}: expected {} got {}", names[check], fixture, expected, actual));
        }
    }
    assert!(mismatches.is_empty(), "{} of {} cases mismatched:\\n{}", mismatches.len(), count, mismatches.iter().take(20).cloned().collect::<Vec<_>>().join("\\n"));
}
`,
    )
    const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
    const goType = (prefix: string) => runtime(`${pascal(prefix)}Value`)
    const tableField = (prefix: string) => `${camel(prefix)}Values`
    const tablesType = go.pointer(go.ident('parityTables'))
    const fillers: string[] = []
    const fillerDeclarations = [...tables.entries()].flatMap(([prefix, table]) => {
      const chunks: GoExpression[][] = []
      for (let start = 0; start < table.go.length; start += 200)
        chunks.push(table.go.slice(start, start + 200))
      return chunks.map((chunk, chunkIndex) => {
        const statements: GoStatement[] = []
        const values = chunk.map((value, position) => {
          const binding = goFixtureBinding(value, `${camel(prefix)}${chunkIndex}_${position}_`)
          statements.push(...binding.statements)
          return binding.expression
        })
        const field = go.selector(go.ident('t'), tableField(prefix))
        statements.push(go.assign([field], [go.call(go.ident('append'), [field, ...values])], '='))
        const name = `fill${pascal(prefix)}${chunkIndex}`
        fillers.push(name)
        return go.function(name, [{ names: ['t'], type: tablesType }], [], statements)
      })
    })
    const runnerType = go.functionType(
      [
        { names: [], type: tablesType },
        { names: [], type: go.slice(go.ident('int')) },
      ],
      [{ names: [], type: runtime('CheckOutcome') }],
    )
    const runnerDeclarations = checkNames.map((name, index) =>
      go.function(
        `runCheck${index}`,
        [
          { names: ['t'], type: tablesType },
          { names: ['a'], type: go.slice(go.ident('int')) },
        ],
        [{ names: [], type: runtime('CheckOutcome') }],
        [
          go.return(
            go.call(
              go.selector(go.ident('generated'), pascal(entries.get(name)!.entryName)),
              argumentPrefixes(name).map((prefix, position) =>
                go.index(
                  go.selector(go.ident('t'), tableField(prefix)),
                  go.index(go.ident('a'), go.number(position)),
                ),
              ),
            ),
          ),
        ],
      ),
    )
    const parityDirectory = join(directory, 'go', 'parity')
    await mkdir(parityDirectory, { recursive: true })
    await writeFile(
      join(parityDirectory, 'tables_test.go'),
      printGoFile({
        package: 'parity',
        imports: [
          { alias: 'generated', path: goParityModule },
          { path: goParityModule + '/checkruntime' },
          ...([...tables.values()].some((table) => table.jsonpath)
            ? [{ path: goParityModule + '/pg_catalog' }]
            : []),
        ],
        declarations: [
          go.type(
            'parityTables',
            go.struct(
              [...tables.keys()].map((prefix) => ({
                names: [tableField(prefix)],
                type: go.slice(goType(prefix)),
              })),
            ),
          ),
          go.function(
            'newParityTables',
            [],
            [{ names: [], type: tablesType }],
            [
              go.assign([go.ident('t')], [go.address(go.composite(go.ident('parityTables')))]),
              ...fillers.map((name) => go.expression(go.call(go.ident(name), [go.ident('t')]))),
              go.return(go.ident('t')),
            ],
          ),
          ...fillerDeclarations,
          ...runnerDeclarations,
          go.function(
            'parityRunners',
            [],
            [{ names: [], type: go.slice(runnerType) }],
            [
              go.return(
                go.composite(
                  go.slice(runnerType),
                  checkNames.map((_, index) => go.ident(`runCheck${index}`)),
                ),
              ),
            ],
          ),
          go.function(
            'parityNames',
            [],
            [{ names: [], type: go.slice(go.ident('string')) }],
            [go.return(go.composite(go.slice(go.ident('string')), checkNames.map(go.string)))],
          ),
        ],
      }),
    )
    await writeFile(
      join(parityDirectory, 'driver_test.go'),
      `package parity

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"testing"

	"${goParityModule}/checkruntime"
)

func runParityCase(runner func(*parityTables, []int) checkruntime.CheckOutcome, tables *parityTables, args []int) (code string) {
	defer func() {
		if recover() != nil {
			code = "panic"
		}
	}()
	actual := runner(tables, args)
	switch actual.Kind {
	case checkruntime.CheckOutcomeTrue:
		return "T"
	case checkruntime.CheckOutcomeFalse:
		return "F"
	case checkruntime.CheckOutcomeNull:
		return "N"
	case checkruntime.CheckOutcomeUnknown:
		return "U"
	default:
		return "E" + strconv.Itoa(actual.Error.State)
	}
}

func TestChecksMatchPostgres(t *testing.T) {
	tables := newParityTables()
	runners := parityRunners()
	names := parityNames()
	data, err := os.ReadFile(${JSON.stringify(casesPath)})
	if err != nil {
		t.Fatal(err)
	}
	var mismatches []string
	count := 0
	for _, line := range strings.Split(strings.TrimRight(string(data), "\\n"), "\\n") {
		parts := strings.Split(line, " ")
		check, _ := strconv.Atoi(parts[0])
		var args []int
		if len(parts) > 3 && parts[3] != "" {
			for _, item := range strings.Split(parts[3], ",") {
				value, _ := strconv.Atoi(item)
				args = append(args, value)
			}
		}
		count++
		if actual := runParityCase(runners[check], tables, args); actual != parts[2] {
			mismatches = append(mismatches, fmt.Sprintf("%s %s: expected %s got %s", names[check], parts[1], parts[2], actual))
		}
	}
	if len(mismatches) > 0 {
		shown := mismatches
		if len(shown) > 20 {
			shown = shown[:20]
		}
		t.Fatalf("%d of %d cases mismatched:\\n%s", len(mismatches), count, strings.Join(shown, "\\n"))
	}
}
`,
    )
  }
  if (dataDriven) await writeDataDrivenFixtures()
  else {
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
      const binding = goFixtureBinding(
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
        `fixture${index}_`,
      )
      const assertions = [
        ...binding.statements,
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
          go.assign([actual], [binding.expression]),
        ),
      ]
      goAssertions.push(...assertions)
      goAssertionBytes += Buffer.byteLength(JSON.stringify(assertions))
      goBatchFixtures++
      if (goBatchFixtures === 125 || goAssertionBytes >= 512 * 1024) await flushGoAssertions()
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
  }
  await run('rustc', [
    '--edition',
    '2021',
    '-Awarnings',
    '--test',
    '--extern',
    `pgsid_parity_runtime=${runtimeLibrary}`,
    join(directory, 'checks_test.rs'),
    '-o',
    join(directory, 'rust-test'),
  ]).catch((error: { stdout: string; stderr: string }) => {
    throw new Error(error.stdout + error.stderr, { cause: error })
  })
  await run(join(directory, 'rust-test'), []).catch((error: { stdout: string; stderr: string }) => {
    throw new Error(error.stdout + error.stderr, { cause: error })
  })
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
  await writeFile(join(directory, 'go/go.mod'), `module ${goParityModule}\n\ngo 1.25\n`)
  // The data-driven driver reads its cases at runtime, so a cached pass could be stale.
  await run('go', ['test', '-count=1', '-trimpath', '-p', '1', './...'], {
    cwd: join(directory, 'go'),
    env: { ...process.env, GOCACHE: checkGoCacheDirectory },
  }).catch((error: { stdout: string; stderr: string }) => {
    throw new Error(error.stdout + error.stderr, { cause: error })
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
        if (
          input.type === 'pg_catalog.aclitem' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'grantee' in value.value
        )
          return generated.makeAclitemValue(
            value.value.grantee,
            value.value.grantor,
            value.value.privileges,
            value.value.grantOptions,
          )
        if (
          input.type === 'pg_catalog.tsvector' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'lexemes' in value.value
        )
          return generated.makeTsvectorValue(value.value)
        if (
          input.type === 'pg_catalog.tsquery' &&
          value.kind === 'Value' &&
          typeof value.value === 'object' &&
          'nodes' in value.value
        )
          return generated.makeTsqueryValue(value.value)
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
          return generated.makeStoredTimestampValue(value.value)
        return input.type === 'pg_catalog.timestamptz' && value.kind === 'Value'
          ? generated.makeStoredTimestamptzValue(value.value)
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
