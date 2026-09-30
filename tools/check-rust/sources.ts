import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import type { CheckRustSource } from '../../src/codegen/shared/check-rust-source.js'

export function writeCheckRustSources(path: string, source: CheckRustSource): void {
  const directory = join(dirname(path), basename(path, '.rs') + '-modules')
  mkdirSync(directory, { recursive: true })
  const declarations: string[] = []
  for (const module of source.modules) {
    const files = module.files.map((file, index) => {
      const name = `${module.name}-${index}.rs`
      writeFileSync(join(directory, name), file.source)
      return `include!(${JSON.stringify(name)});`
    })
    const imports = module.dependencies.map((name) => `use crate::${name}::*;`)
    writeFileSync(join(directory, module.name + '.rs'), [...imports, ...files].join('\n') + '\n')
    declarations.push(
      `#[path = ${JSON.stringify(basename(directory) + '/' + module.name + '.rs')}]\nmod ${module.name};`,
    )
    if (module.name !== 'regex_engine') declarations.push(`pub use ${module.name}::*;`)
  }
  writeFileSync(path, declarations.join('\n') + '\n')
  writeFileSync(path.replace(/\.rs$/u, '.sources.json'), JSON.stringify(source, null, 2) + '\n')
}
