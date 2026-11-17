import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  printRustFile,
  rust,
  type RustExpression,
  type RustItem,
  type RustPattern,
  type RustType,
} from './ast.js'
import { rustEvaluatorArtifacts, type RustSourceModule } from './evaluator.js'

// The values module's files: fixed source, the same for every project.
const files = [
  'bits.rs',
  'check.rs',
  'dims.rs',
  'error.rs',
  'clock.rs',
  'geometry.rs',
  'identifiers.rs',
  'json.rs',
  'network.rs',
  'range.rs',
  'temporal.rs',
] as const

// The evaluator callables the values call: numeric arithmetic, order and input, and text search
// output.
export const rustNumericRoots = [
  'pg_catalog::tsvector_to_text',
  'pg_catalog::tsquery_to_text',
  'pg_catalog::sql__pg_catalog__numeric_add__o3d7',
  'pg_catalog::sql__pg_catalog__numeric_sub__ys09',
  'pg_catalog::sql__pg_catalog__numeric_mul__bj4l',
  'pg_catalog::sql__pg_catalog__numeric_div__pnzm',
  'pg_catalog::sql__pg_catalog__numeric_mod__8ywz',
  'pg_catalog::sql__pg_catalog__numeric_uminus__wcmy',
  'pg_catalog::sql__pg_catalog__numeric_abs__6g5e',
  'pg_catalog::sql__pg_catalog__round__otcq',
  'pg_catalog::sql__pg_catalog__trunc__hay3',
  'pg_catalog::sql__pg_catalog__numeric_cmp__6h4s',
  'pg_catalog::sql__pg_catalog__numeric_eq__fw7r',
  'pg_catalog::sql__pg_catalog__sign__2rsu',
  'pg_catalog::scalar_numeric_from_text',
  'checkruntime::make_numeric_value',
  'checkruntime::numeric_text',
  'checkruntime::make_text_value',
  'checkruntime::make_int4_value',
  'checkruntime::sql_error_message',
] as const

const source = (name: string): string => {
  const asset = new URL(`./assets/values/${name}`, import.meta.url)
  return readFileSync(
    existsSync(asset) ? asset : new URL(`./values/${name}`, import.meta.url),
    'utf8',
  )
}

/**
 * The values module, with the values that call the CHECK evaluator, and the evaluator itself, only
 * where generated code names one of them. Code rendered apart from `contents`, such as queries,
 * names what `needs` adds.
 */
export const rustValueArtifacts = (
  directory: string,
  contents: readonly string[],
  needs: { evaluator?: boolean; unions?: readonly string[]; checks?: RustSourceModule } = {},
): { path: string; content: string }[] => {
  // Each set of dimension counts a generated type names, as its own enum.
  const unions = [
    ...new Set([
      ...(needs.unions ?? []),
      ...contents.flatMap((content) =>
        [...content.matchAll(/\bpgsid::(Array\d(?:Or\d)+)\b/gu)].map((match) => match[1]!),
      ),
    ]),
  ].sort()
  const values =
    needs.evaluator === true ||
    contents.some((content) =>
      /\bpgsid::(?:Numeric|Tsvector|Tsquery|Xml|Jsonpath|Aclitem)\b/u.test(content),
    )
  // What generated code calls in the evaluator, besides the values.
  const called = contents.flatMap((content) =>
    [
      ...content.matchAll(
        /\bevaluator::(checkruntime|pg_catalog|checks)::([A-Za-z_][A-Za-z0-9_]*)/gu,
      ),
    ].map((match) => `${match[1]}::${match[2]}`),
  )
  const evaluator = values || called.length > 0
  return [
    {
      path: join(directory, 'mod.rs'),
      content:
        source('mod.rs') +
        (evaluator ? source('evaluator-mod.rs') : '') +
        (values ? source('evaluator-values-mod.rs') : '') +
        (unions.length
          ? `\n${printRustFile(
              unions.flatMap((name): RustItem[] => [
                { kind: 'mod', name: name.toLowerCase() },
                { kind: 'use', visibility: 'pub', path: `${name.toLowerCase()}::${name}` },
              ]),
            )}`
          : ''),
    },
    ...unions.map((name) => ({
      path: join(directory, `${name.toLowerCase()}.rs`),
      content: printRustFile(dimensionUnion(name)),
    })),
    ...files.map((name) => ({ path: join(directory, name), content: source(name) })),
    ...(evaluator
      ? [
          ...(values
            ? [
                { path: join(directory, 'numeric.rs'), content: source('numeric.rs') },
                { path: join(directory, 'text.rs'), content: source('text.rs') },
              ]
            : []),
          ...rustEvaluatorArtifacts(
            join(directory, 'evaluator'),
            [...new Set([...(values ? rustNumericRoots : []), ...called])],
            needs.checks ? [needs.checks] : [],
          ),
        ]
      : []),
  ]
}

// An array of one of several dimension counts: an enum with a variant of nested vectors for each
// count. An array of another count is a dimension error, and the empty array reads as the variant
// of the lowest count.
function dimensionUnion(name: string): RustItem[] {
  const counts = name.slice('Array'.length).split('Or').map(Number)
  const t = rust.path('T')
  const nested = (depth: number): RustType => (depth === 0 ? t : rust.vec(nested(depth - 1)))
  const self = rust.generic(name, t)
  const boxError: RustType = rust.generic('Box', {
    kind: 'dyn',
    bounds: [rust.path('std', 'error', 'Error'), rust.path('Sync'), rust.path('Send')],
  })
  const declared: RustExpression = {
    kind: 'unary',
    operator: '&',
    operand: { kind: 'array', items: counts.map((count) => rust.number(count)) },
  }
  const shape = (count: number): RustExpression =>
    rust.call(
      rust.expressionPath('Ok'),
      rust.call(
        rust.expressionPath('Self', `D${count}`),
        rust.try(
          rust.call(
            { kind: 'path', path: ['super', 'dims', 'shape'], generics: [t, nested(count)] },
            rust.ident('lengths'),
            rust.ident('values'),
            declared,
          ),
        ),
      ),
    )
  const typeParameter = {
    pattern: rust.binding('ty'),
    type: rust.ref(rust.path('postgres_types', 'Type')),
  }
  const accepts = (trait: RustType) => ({
    kind: 'fn' as const,
    name: 'accepts',
    parameters: [typeParameter],
    result: rust.path('bool'),
    body: [
      rust.return(
        rust.call(
          { kind: 'path', path: ['super', 'dims', 'accepts'], generics: [t] },
          rust.ident('ty'),
          { kind: 'qualified', type: t, trait, name: 'accepts' },
        ),
      ),
    ],
  })
  const fromSql: RustType = {
    kind: 'path',
    path: ['postgres_types', 'FromSql'],
    generics: [{ kind: 'lifetime', name: 'a' }],
  }
  const toSql = rust.path('postgres_types', 'ToSql')
  return [
    {
      kind: 'enum',
      name,
      visibility: 'pub',
      generics: [{ name: 'T' }],
      attributes: [rust.derive('Debug', 'Clone', 'PartialEq')],
      doc: `An array of ${counts.join(' or ')} dimensions.`,
      variants: counts.map((count) => ({
        name: `D${count}`,
        fields: { kind: 'tuple', items: [{ type: nested(count) }] },
      })),
    },
    {
      kind: 'impl',
      generics: [
        { name: 'a', lifetime: true },
        { name: 'T', bounds: [fromSql] },
      ],
      trait: fromSql,
      type: self,
      items: [
        {
          kind: 'fn',
          name: 'from_sql',
          parameters: [
            typeParameter,
            {
              pattern: rust.binding('raw'),
              type: rust.ref({ kind: 'slice', type: rust.path('u8') }, 'a'),
            },
          ],
          result: rust.generic('Result', rust.path('Self'), boxError),
          body: [
            {
              kind: 'let',
              pattern: { kind: 'tuple', items: [rust.binding('lengths'), rust.binding('values')] },
              value: rust.try(
                rust.call(
                  { kind: 'path', path: ['super', 'dims', 'read'], generics: [t] },
                  rust.ident('ty'),
                  rust.ident('raw'),
                ),
              ),
            },
            rust.return({
              kind: 'match',
              value: rust.method(rust.ident('lengths'), 'len'),
              arms: [
                ...counts.map((count, index): { pattern: RustPattern; body: RustExpression } => ({
                  pattern:
                    index === 0
                      ? {
                          kind: 'or',
                          items: [
                            { kind: 'literal', value: rust.number(0) },
                            { kind: 'literal', value: rust.number(count) },
                          ],
                        }
                      : { kind: 'literal', value: rust.number(count) },
                  body: shape(count),
                })),
                {
                  pattern: rust.binding('found'),
                  body: rust.call(
                    rust.expressionPath('Err'),
                    rust.call(rust.expressionPath('Box', 'new'), {
                      kind: 'struct',
                      path: ['super', 'dims', 'DimensionError'],
                      fields: [{ name: 'found' }, { name: 'declared', value: declared }],
                    }),
                  ),
                },
              ],
            }),
          ],
        },
        accepts(fromSql),
      ],
    },
    {
      kind: 'impl',
      generics: [{ name: 'T', bounds: [toSql] }],
      trait: toSql,
      type: self,
      items: [
        {
          kind: 'fn',
          name: 'to_sql',
          receiver: '&self',
          parameters: [
            typeParameter,
            {
              pattern: rust.binding('out'),
              type: { kind: 'reference', mutable: true, type: rust.path('bytes', 'BytesMut') },
            },
          ],
          result: rust.generic('Result', rust.path('postgres_types', 'IsNull'), boxError),
          body: [
            rust.return({
              kind: 'match',
              value: rust.ident('self'),
              arms: counts.map((count) => ({
                pattern: {
                  kind: 'tuple-struct',
                  path: ['Self', `D${count}`],
                  items: [rust.binding('value')],
                },
                body: rust.call(
                  {
                    kind: 'path',
                    path: ['super', 'dims', 'unshape'],
                    generics: [t, nested(count)],
                  },
                  rust.ident('ty'),
                  rust.ident('value'),
                  rust.ident('out'),
                ),
              })),
            }),
          ],
        },
        accepts(toSql),
        { kind: 'macro', path: ['postgres_types', 'to_sql_checked'] },
      ],
    },
  ]
}
