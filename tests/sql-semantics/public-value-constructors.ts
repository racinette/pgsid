import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { typescriptNumericArtifacts } from '../../src/codegen/typescript/numeric-module.js'
import { typescriptQueryableSource } from '../../src/codegen/typescript/sql/codecs.js'

export type PublicNumeric = { toString(): string }
export type PublicJson = { readonly text: string; value(): unknown }

// The generated constructors of the public values that are not plain data: numerics from the
// numeric module and JSON containers from the runtime's support module, written as a project's
// generation writes them, for suites that call the generated CHECK API without building one.
export async function publicValueConstructors(): Promise<{
  numeric(value: string | bigint): PublicNumeric
  json(value: unknown): PublicJson
  jsonText(text: string): PublicJson
}> {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-public-values-'))
  for (const artifact of [
    ...typescriptNumericArtifacts(),
    { path: 'queryable.ts', content: typescriptQueryableSource },
  ]) {
    const path = join(directory, 'pgsid', artifact.path)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, artifact.content)
  }
  const { numeric } = (await import(join(directory, 'pgsid', 'numeric.ts'))) as {
    numeric(value: string | bigint): PublicNumeric
  }
  const { json, jsonText } = (await import(join(directory, 'pgsid', 'queryable.ts'))) as {
    json(value: unknown): PublicJson
    jsonText(text: string): PublicJson
  }
  return { numeric, json, jsonText }
}
