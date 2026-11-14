import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// The values module's files: fixed source, the same for every project.
const files = ['json.rs', 'range.rs', 'temporal.rs'] as const

// The evaluator callables the numeric value calls: its arithmetic, order and input.
export const rustNumericRoots = [
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
  'checkruntime::make_text_value',
  'checkruntime::make_int4_value',
  'checkruntime::sql_error_message',
] as const

const source = (name: string): string => {
  const asset = new URL(`./assets/values/${name}`, import.meta.url)
  return readFileSync(existsSync(asset) ? asset : new URL(`./values/${name}`, import.meta.url), 'utf8')
}

// The evaluator modules the numeric value calls, pruned when the asset is built.
const numericEvaluator = (): { path: string; content: string }[] => {
  const asset = new URL('./assets/rust-numeric.json', import.meta.url)
  return (
    JSON.parse(
      readFileSync(existsSync(asset) ? asset : new URL('./rust-numeric.json', import.meta.url), 'utf8'),
    ) as { files: { path: string; content: string }[] }
  ).files
}

/**
 * The values module, with the numeric value and the evaluator it calls only where generated code
 * names a numeric.
 */
export const rustValueArtifacts = (
  directory: string,
  contents: readonly string[],
): { path: string; content: string }[] => {
  const numeric = contents.some((content) => /\bpgsid::Numeric\b/u.test(content))
  return [
    {
      path: join(directory, 'mod.rs'),
      content: source('mod.rs') + (numeric ? source('numeric-mod.rs') : ''),
    },
    ...files.map((name) => ({ path: join(directory, name), content: source(name) })),
    ...(numeric
      ? [
          { path: join(directory, 'numeric.rs'), content: source('numeric.rs') },
          { path: join(directory, 'numeric_evaluator', 'mod.rs'), content: source('numeric-evaluator.rs') },
          ...numericEvaluator().map((file) => ({
            path: join(directory, 'numeric_evaluator', file.path),
            content: file.content,
          })),
        ]
      : []),
  ]
}
