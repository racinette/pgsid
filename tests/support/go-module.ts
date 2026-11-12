import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const fixture = new URL('../fixtures/codegen/project/', import.meta.url)

// A Go module for generated code, with the fixture project's requirements and checksums: the
// generated value package imports pgx.
export async function writeGoModule(directory: string, module: string): Promise<void> {
  await writeFile(
    join(directory, 'go.mod'),
    (await readFile(new URL('go.mod', fixture), 'utf8')).replace(/^module .*$/mu, `module ${module}`),
  )
  await copyFile(new URL('go.sum', fixture), join(directory, 'go.sum'))
}
