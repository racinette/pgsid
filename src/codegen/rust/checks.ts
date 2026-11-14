import { existsSync, readFileSync } from 'node:fs'
import type { CatalogSnapshot, DomainInfo, TableInfo } from '../../catalog/types.js'
import type { Config } from '../../config/schema.js'
import { catalogCheckGroups, type CatalogCheckGroup } from '../../sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../shared/check-atom-support.js'
import { checkRustTextInput, checkRustValueType, type CheckExecutionContext } from '../shared/check-rust-evaluator.js'
import { prepareCheckRustGroup } from '../shared/check-rust-source.js'
import { checkTypeModifierCoercion } from '../shared/check-type-modifiers.js'
import { rust, type RustExpression, type RustItem, type RustPattern, type RustStatement, type RustType } from './ast.js'
import { splitRustItems, type RustSourceModule } from './evaluator.js'
import { rustEnumVariants } from './names.js'

// CHECK constraints evaluated through the evaluator the values module carries: a table's checks
// read a struct of its columns' public values, a domain's checks its value, each converted to the
// evaluator's value of its type as the server reads a parameter.

type Prepared = ReturnType<typeof prepareCheckRustGroup>
type PreparedCheck = Prepared['checks'][number]
type Input = Extract<PreparedCheck, { kind: 'supported' }>['inputs'][number]

export interface RustCheckPlan {
  groups: readonly { group: CatalogCheckGroup; checks: readonly { owner: string; constraint: string; prepared: PreparedCheck }[] }[]
  module: RustSourceModule | null
  context: CheckExecutionContext
}

const asset = (name: string): string => {
  const source = new URL(`./assets/${name}`, import.meta.url)
  return readFileSync(existsSync(source) ? source : new URL(`./${name}`, import.meta.url), 'utf8')
}

/** Every CHECK of the catalog's tables and domains, prepared for the evaluator at once. */
export function planRustChecks(catalog: CatalogSnapshot, config?: Config): RustCheckPlan {
  const context = config?.sql.codegen?.checks ?? {}
  const groups = catalogCheckGroups(
    catalog.tables,
    catalog.domains,
    catalog.domains,
    catalog.enums,
    catalog.rangeTypes,
    catalog.compositeTypeGraph,
  )
  if (!groups.length) return { groups: [], module: null, context }
  const flat = groups.flatMap((group) =>
    group.checks.map(({ plan, source }) => ({
      expression: portableCheckAtoms(plan.expression),
      identity: {
        schema: group.source.schema,
        kind: group.kind,
        owner: group.source.name,
        constraint: plan.name,
        declaredOn: { schema: source.schema, owner: source.name },
      },
    })),
  )
  const prepared = prepareCheckRustGroup(flat, context)
  let index = 0
  return {
    context,
    groups: groups.map((group) => ({
      group,
      checks: group.checks.map(({ plan, source }) => ({
        owner: `${source.schema}.${source.name}`,
        constraint: plan.name,
        prepared: prepared.checks[index++]!,
      })),
    })),
    module: prepared.evaluatorSource
      ? {
          name: 'checks',
          dependencies: ['checkruntime', 'pg_catalog'],
          items: splitRustItems(
            [prepared.evaluatorSource, ...(prepared.sharedDeclarations ?? []).map((item) => item.source), asset('check-inputs.rs')].join('\n'),
          ),
        }
      : null,
  }
}

/**
 * How the code reaches a column's or domain's base value from its public value: a domain newtype
 * holds its base, and an enum of a CHECK literal set gives its value.
 */
export type RustBaseAccess = (value: RustExpression) => RustExpression

export interface RustCheckSubject {
  /** Where the values module and the evaluator are, from the generated code. */
  values: readonly string[]
  /** The public type of an input, set, and the access to its base value. */
  input: (name: string) => { type: RustType; access: RustBaseAccess; typeMod: number; baseOid: number } | null
  /** A PostgreSQL enum's Rust type. */
  enumType: (schema: string, name: string) => RustType
  catalog: CatalogSnapshot
}

const path = (...segments: string[]): RustExpression => ({ kind: 'path', path: segments })

/**
 * The evaluator's value of an input, from the public value `value` refers to, or null where its
 * type is one the Rust inputs do not read.
 */
function payload(
  input: Input,
  rustType: string,
  base: RustExpression,
  subject: RustCheckSubject,
  context: CheckExecutionContext,
  baseOid: number,
): RustExpression | null {
  const evaluator = (module: string, name: string) => path(...subject.values, 'evaluator', module, name)
  const checks = (name: string, ...args: RustExpression[]) => rust.call(evaluator('checks', name), ...args)
  const reference = rust.ref_(base)
  const text = (value: RustExpression) => checks('text', rust.ref_(value))
  const shown = rust.method(base, 'to_string')
  const textInput = (call: { module: 'operations' | 'runtime'; callable: string; args: (boolean | number)[] } | null, value: RustExpression) =>
    call
      ? rust.call(
          evaluator(call.module === 'runtime' ? 'checkruntime' : 'pg_catalog', call.callable),
          text(value),
          ...call.args.map((arg) => (typeof arg === 'boolean' ? rust.bool(arg) : rust.number(arg))),
        )
      : null
  const utf8 = context.serverEncoding === 'UTF8'
  switch (rustType) {
    case 'BoolValue':
      return checks('boolean', reference)
    case 'Int2Value':
      return checks('int2', reference)
    case 'Int4Value':
      return checks('int4', reference)
    case 'Int8Value':
      return checks('int8', reference)
    case 'Float4Value':
      return checks('float4', reference)
    case 'Float8Value':
      return checks('float8', reference)
    case 'TextValue':
      if (input.type === 'pg_catalog.name') return checks('name_text', reference)
      if (input.type === 'pg_catalog.refcursor') return checks('refcursor_text', rust.ref_(rust.field(base, '0')))
      return checks('text', reference)
    case 'NumericValue':
      return checks('numeric', reference)
    case 'DateValue':
      return checks('date', reference)
    case 'TimestampValue':
      return checks('timestamp', reference)
    case 'TimestamptzValue':
      return checks('timestamptz', reference)
    case 'IntervalValue':
      return checks('interval', reference)
    case 'TimeValue':
      return checks('time', reference)
    case 'TimetzValue':
      return checks('timetz', reference)
    case 'UuidValue':
      return checks('uuid', reference)
    case 'ByteaValue':
      return checks('bytea', reference)
    case 'PointValue':
      return checks('point', reference)
    case 'LineValue':
      return checks('line', reference)
    case 'LsegValue':
      return checks('lseg', reference)
    case 'BoxValue':
      return checks('pg_box', reference)
    case 'PathValue':
      return checks('path', reference)
    case 'PolygonValue':
      return checks('polygon', reference)
    case 'CircleValue':
      return checks('circle', reference)
    case 'XidValue':
      return checks('xid', reference)
    case 'CidValue':
      return checks('cid', reference)
    case 'Xid8Value':
      return checks('xid8', reference)
    case 'PgLsnValue':
      return checks('pg_lsn', reference)
    case 'TidValue':
      return checks('tid', reference)
    case 'MoneyValue':
      return checks('money', reference)
    case 'InternalCharValue':
      return checks('internal_char', reference)
    case 'OidValue':
      return checks(baseOid === 26 ? 'oid' : 'oid_alias', reference)
    case 'NetworkValue':
      return rust.call(evaluator('checkruntime', input.type === 'pg_catalog.cidr' ? 'cidr_from_text' : 'network_from_text'), text(shown))
    case 'MacaddrValue':
      return rust.call(evaluator('checkruntime', 'macaddr_from_text'), text(shown))
    case 'Macaddr8Value':
      return rust.call(evaluator('checkruntime', 'macaddr8_from_text'), text(shown))
    case 'BitValue':
      return rust.call(evaluator('checkruntime', 'bit_from_text'), text(shown))
    case 'JsonValue':
    case 'JsonbValue':
      return textInput(checkRustTextInput(rustType === 'JsonValue' ? 'pg_catalog."json"' : 'pg_catalog.jsonb', context), rust.method(base, 'text'))
    case 'JsonpathValue':
      return rust.call(evaluator('pg_catalog', 'jsonpath_from_text'), text(shown), rust.bool(context.defaultCollation === 'C'), rust.bool(utf8))
    case 'XmlValue':
      return textInput(checkRustTextInput('pg_catalog.xml', context), shown)
    case 'TsvectorValue':
      return textInput(checkRustTextInput('pg_catalog.tsvector', context), shown)
    case 'TsqueryValue':
      return textInput(checkRustTextInput('pg_catalog.tsquery', context), shown)
    case 'AclitemValue':
      return textInput(checkRustTextInput('pg_catalog.aclitem', context), shown)
    case 'SnapshotValue':
      return textInput(checkRustTextInput('pg_catalog.pg_snapshot', context), shown)
    case 'EnumValue': {
      const definition = input.enum
      const enumeration = definition && subject.catalog.enums.find((item) => item.schema === definition.schema && item.name === definition.name)
      if (!definition || !enumeration) return null
      const variants = rustEnumVariants(enumeration.values)
      const enumPath = (subject.enumType(enumeration.schema, enumeration.name) as { path: string[] }).path
      return checks(
        'enumeration',
        {
          kind: 'match',
          value: base,
          arms: enumeration.values.map((label, index) => ({
            pattern: { kind: 'path', path: [...enumPath, variants[index]!] } as RustPattern,
            body: rust.number(definition.values.indexOf(label)),
          })),
        },
      )
    }
  }
  return null
}

/**
 * The items evaluating one group's checks: for a table, a struct of the columns they read with
 * methods evaluating and validating them and a conversion from the table's row; for a domain,
 * methods on the domain's type.
 */
export function rustCheckItems(
  plan: RustCheckPlan['groups'][number] | undefined,
  subject: RustCheckSubject,
  context: CheckExecutionContext,
  owner:
    | {
        kind: 'table'
        table: TableInfo
        row: string
        fields: ReadonlyMap<string, { field: string; nullable: boolean }>
        // Columns of a domain with CHECKs, which the server checks as it reads them.
        domains: readonly { column: string; type: RustType }[]
      }
    | { kind: 'domain'; domain: DomainInfo; type: string },
): RustItem[] {
  const checks = plan?.checks ?? []
  const values = (...segments: string[]): RustType => rust.path(...subject.values, ...segments)
  const valueExpression = (...segments: string[]) => path(...subject.values, ...segments)
  const runtime = (name: string) => [...subject.values, 'evaluator', 'checkruntime', name]
  const inputs = [
    ...new Map(
      checks.flatMap((check) => (check.prepared.kind === 'supported' ? check.prepared.inputs : [])).map((input) => [input.name, input]),
    ).values(),
  ]
  // A table's input is its struct's field; a domain's is its value.
  const field = (name: string): RustExpression =>
    owner.kind === 'table' ? rust.ref_(rust.field(rust.ident('self'), owner.fields.get(name)!.field)) : rust.ref_(rust.ident('value'))
  const read = (input: Input, rustType: string): RustExpression | null => {
    const found = subject.input(input.name)
    if (!found) return null
    const converted = payload(input, rustType, found.access(rust.ident('value')), subject, context, found.baseOid)
    if (!converted) return null
    let value: RustExpression = rust.call(
      valueExpression('evaluator', 'checks', 'read'),
      field(input.name),
      path(...runtime(rustType), 'Unknown'),
      path(...runtime(rustType), 'Null'),
      { kind: 'closure', parameters: [{ pattern: rust.binding('value') }], body: converted },
    )
    // A value is read through the type modifier too; one the evaluator cannot apply leaves the
    // value undecided.
    if (found.typeMod >= 0) {
      const coercion = checkTypeModifierCoercion(input.type)
      value = coercion
        ? rust.call(
            path(...subject.values, 'evaluator', 'pg_catalog', coercion.callable),
            value,
            rust.call(path(...runtime('make_int4_value')), rust.number(found.typeMod)),
            ...(coercion.explicit ? [rust.call(path(...runtime('make_bool_value')), rust.bool(false))] : []),
          )
        : path(...runtime(rustType), 'Unknown')
    }
    return value
  }
  const fault = (rustType: string, value: RustExpression): RustExpression => ({
    kind: 'match',
    value: rust.ref_(value),
    arms: [
      {
        pattern: { kind: 'tuple-struct', path: [...runtime(rustType), 'Error'], items: [rust.binding('error')] },
        body: rust.call(rust.ident('Some'), rust.call(rust.ident('Some'), { kind: 'unary', operator: '*', operand: rust.ident('error') })),
      },
      {
        pattern: { kind: 'or', items: [{ kind: 'path', path: [...runtime(rustType), 'Unknown'] }, { kind: 'path', path: [...runtime(rustType), 'Unimplemented'] }] },
        body: rust.call(rust.ident('Some'), rust.ident('None')),
      },
      { pattern: { kind: 'wild' }, body: rust.ident('None') },
    ],
  })
  const evaluation = (check: (typeof checks)[number]): RustExpression => {
    const undecided = (reason: string): RustExpression => ({
      kind: 'struct',
      path: [...subject.values, 'CheckResult', 'Undecided'],
      fields: [{ name: 'reason', value: rust.method(rust.string(reason), 'to_owned') }],
    })
    const evaluated = (result: RustExpression) =>
      rust.call(valueExpression('evaluator', 'checks', 'evaluation'), rust.string(check.owner), rust.string(check.constraint), result)
    if (check.prepared.kind === 'unsupported') return evaluated(undecided(check.prepared.reason))
    const statements: RustStatement[] = []
    const faults: RustExpression[] = []
    for (const input of check.prepared.inputs) {
      const valueType = input.nullness ? checkRustValueType(input.enum ? `enum:${JSON.stringify([input.enum.schema, input.enum.name])}` : input.type) : input.rustType
      const value = read(input, valueType)
      if (!value) return evaluated(undecided(`Rust CHECK evaluation does not read values of type ${input.type}.`))
      // A NULL test reads the value too: a value the server's input refuses fails the check.
      statements.push(rust.let(input.rustName, input.nullness ? rust.call(valueExpression('evaluator', 'checks', 'nullness'), field(input.name)) : value))
      faults.push(
        rust.call(valueExpression('evaluator', 'checks', 'supplied'), field(input.name), fault(valueType, input.nullness ? value : rust.ident(input.rustName))),
      )
    }
    const entry = check.prepared.diagnosticEntryName ?? check.prepared.entryName
    statements.push(
      rust.let('faults', { kind: 'array', items: faults }),
      rust.return(
        rust.call(
          valueExpression('evaluator', 'checks', check.prepared.diagnosticEntryName ? 'decide_diagnosed' : 'decide'),
          rust.ref_(rust.ident('faults')),
          {
            kind: 'closure',
            move: true,
            parameters: [],
            body: rust.call(valueExpression('evaluator', 'checks', entry), ...check.prepared.inputs.map((input) => rust.ident(input.rustName))),
          },
        ),
      ),
    )
    return evaluated({ kind: 'block', statements })
  }
  const evaluationType = values('CheckEvaluation')
  const evaluate = {
    kind: 'fn' as const,
    visibility: 'pub' as const,
    receiver: '&self' as const,
    parameters: [],
    result: rust.vec(evaluationType),
  }
  const validate = (name: string, doc: string) => ({
    kind: 'fn' as const,
    name,
    visibility: 'pub' as const,
    doc,
    receiver: '&self' as const,
    parameters: [],
    result: rust.generic('Result', { kind: 'tuple', items: [] }, values('CheckError')),
    body: [rust.return(rust.call(valueExpression('validate_checks'), rust.method(rust.ident('self'), name === 'validate' ? 'evaluate' : 'evaluate_checks')))],
  })
  const evaluations = rust.macro('vec', ...checks.map(evaluation))
  if (owner.kind === 'domain')
    return [
      {
        kind: 'impl',
        type: rust.path(owner.type),
        items: [
          {
            kind: 'fn',
            name: 'check_value',
            visibility: 'pub',
            doc: `Evaluates the CHECKs of ${owner.domain.schema}.${owner.domain.name} on a value, which may be NULL or unknown.`,
            parameters: [{ pattern: rust.binding('value'), type: rust.generic([...subject.values, 'CheckValue'], rust.ref(rust.path('Self'))) }],
            result: rust.vec(evaluationType),
            body: [rust.return(evaluations)],
          },
          {
            ...evaluate,
            name: 'evaluate_checks',
            doc: `Evaluates the CHECKs of ${owner.domain.schema}.${owner.domain.name} on the value.`,
            body: [rust.return(rust.call(path('Self', 'check_value'), rust.call(valueExpression('CheckValue', 'Value'), rust.ident('self'))))],
          },
          validate('validate_checks', 'The first CHECK of the domain the value fails, as the server would report it.'),
        ],
      },
    ]
  const { table } = owner
  if (!checks.length && !owner.domains.length) return []
  const name = `${owner.row}CheckInput`
  const names = [...new Set([...owner.domains.map((item) => item.column), ...inputs.map((input) => input.name)])]
  const columns = table.columns
    .filter((column) => names.includes(column.name))
    .map((column) => ({ field: owner.fields.get(column.name)!, type: subject.input(column.name)?.type }))
  // A domain column's own CHECKs come first, as the server checks a value as it reads it.
  const domainEvaluations = owner.domains.map(
    (item): RustExpression =>
      rust.call(
        path(...(item.type as { path: string[] }).path, 'check_value'),
        rust.method(rust.field(rust.ident('self'), owner.fields.get(item.column)!.field), 'as_ref'),
      ),
  )
  return [
    {
      kind: 'struct',
      name,
      visibility: 'pub',
      attributes: [rust.derive('Debug', 'Clone', 'PartialEq', 'Default')],
      doc: `The columns of ${table.schema}.${table.name} its CHECKs read, each unknown until given.`,
      fields: {
        kind: 'struct',
        items: columns.map((column) => ({
          name: column.field.field,
          visibility: 'pub',
          type: rust.generic([...subject.values, 'CheckValue'], column.type ?? rust.path('()')),
        })),
      },
    },
    {
      kind: 'impl',
      type: rust.path(name),
      items: [
        {
          ...evaluate,
          name: 'evaluate',
          doc: `Evaluates the CHECKs of ${table.schema}.${table.name}, and those of its columns' domains, on the columns given.`,
          body: [
            rust.return(
              domainEvaluations.length
                ? rust.method(
                    rust.method(
                      rust.method(rust.macro('vec', ...domainEvaluations, evaluations), 'into_iter'),
                      'flatten',
                    ),
                    'collect',
                  )
                : evaluations,
            ),
          ],
        },
        validate('validate', 'The first CHECK of the table the columns fail, as the server would report it.'),
      ],
    },
    {
      kind: 'impl',
      trait: rust.generic('From', rust.ref(rust.path(owner.row))),
      type: rust.path(name),
      items: [
        {
          kind: 'fn',
          name: 'from',
          parameters: [{ pattern: rust.binding('row'), type: rust.ref(rust.path(owner.row)) }],
          result: rust.path('Self'),
          body: [
            rust.return({
              kind: 'struct',
              path: ['Self'],
              fields: columns.map((column) => {
                const value = rust.method(rust.field(rust.ident('row'), column.field.field), 'clone')
                return {
                  name: column.field.field,
                  value: column.field.nullable
                    ? rust.call(path(...subject.values, 'CheckValue', 'from'), value)
                    : rust.call(path(...subject.values, 'CheckValue', 'Value'), value),
                }
              }),
            }),
          ],
        },
      ],
    },
  ]
}
