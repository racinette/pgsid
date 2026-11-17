import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { checkRustAsset } from '../shared/check-rust-assets.js'
import { printGoFile } from './ast.js'

// The CHECK evaluator's callables the Go numeric value calls: its arithmetic, order and input.
export const goNumericRoots = [
  'pg_catalog.NumericAddO3d7',
  'pg_catalog.NumericSubYs09',
  'pg_catalog.NumericMulBj4l',
  'pg_catalog.NumericDivPnzm',
  'pg_catalog.NumericMod8ywz',
  'pg_catalog.NumericUminusWcmy',
  'pg_catalog.NumericAbs6g5e',
  'pg_catalog.RoundOtcq',
  'pg_catalog.TruncHay3',
  'pg_catalog.NumericCmp6h4s',
  'pg_catalog.NumericEqFw7r',
  'pg_catalog.Sign2rsu',
  'pg_catalog.ScalarNumericFromText',
  'checkruntime.MakeNumericValue',
  'checkruntime.MakeTextValue',
  'checkruntime.MakeInt4Value',
  'checkruntime.SqlErrorMessage',
] as const

// The import path the evaluator files are translated under, replaced by the package's own.
export const goNumericPlaceholder = 'pgsid.invalid/numeric'

export type GoNumericFile = { path: string; content: string }

// The evaluator files the numeric value reaches, translated and pruned when the asset is built.
export function goNumericFiles(): GoNumericFile[] {
  return (
    JSON.parse(checkRustAsset('go-numeric.json').toString('utf8')) as { files: GoNumericFile[] }
  ).files
}

// The numeric value in the pgsid package, with the evaluator files it calls beneath it, internal
// to the package.
export function goNumericArtifacts(
  directory: string,
  importPath: string,
): { path: string; content: string }[] {
  const evaluator = `${importPath}/internal/numeric`
  const asset = new URL('./assets/numeric.go', import.meta.url)
  const source = readFileSync(
    existsSync(asset) ? asset : new URL('./numeric.go', import.meta.url),
    'utf8',
  ).replaceAll(goNumericPlaceholder, evaluator)
  return [
    {
      path: join(directory, 'numeric.go'),
      content: printGoFile({ package: 'pgsid', imports: [], declarations: [], source }),
    },
    ...goNumericFiles().map((file) => ({
      path: join(directory, 'internal', 'numeric', file.path),
      content: file.content.replaceAll(goNumericPlaceholder, evaluator),
    })),
  ]
}
