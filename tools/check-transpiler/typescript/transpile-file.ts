import { readFileSync, writeFileSync } from 'node:fs'
import { transpileCheckRust } from '../../../src/codegen/shared/check-rust-transpile.js'

const [sourcePath, typescriptPath, goPath] = process.argv.slice(2)
if (!sourcePath || !typescriptPath || !goPath)
  throw new Error('usage: transpile-file.ts SOURCE_RUST OUTPUT_TS OUTPUT_GO')

const generated = transpileCheckRust(readFileSync(sourcePath, 'utf8'))
writeFileSync(typescriptPath, generated.typescript)
writeFileSync(goPath, generated.go)
