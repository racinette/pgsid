import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { PG18_TYPE_COMPARISONS } from '../../src/postgres/builtins/type-comparisons.generated.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { checkRustCallableNames } from '../../src/codegen/shared/check-rust-source.js'
import { nativeHashContext } from '../../src/codegen/shared/check-hash-context.js'

const available = checkRustCallableNames()
const profiles = Object.entries(PG18_TYPE_COMPARISONS)
  .filter(([type]) => type === 'pg_catalog.anyenum' || arrayElementFamily(type) !== null)
  .map(([type, support]) => ({
    type,
    ...support,
    implementations: [support.hash, support.hashExtended].map((signature) => {
      if (signature === null) return null
      const metadata = builtinMetadata(signature)
      assert.ok(metadata.kind === 'function')
      assert.ok(available.has(metadata.rustName), signature)
      return {
        signature,
        arguments: metadata.args,
        result: metadata.result,
        implementation: metadata.rustName,
        context: nativeHashContext(metadata),
      }
    }),
  }))
const summary = {
  profiles: profiles.length,
  withDefaultHash: profiles.filter((p) => p.hashClass !== null).length,
  withBothImplementations: profiles.filter((p) => p.implementations.every((i) => i !== null))
    .length,
  missingImplementations: profiles.flatMap((p) =>
    p.implementations.filter((i) => i !== null && !available.has(i.implementation)),
  ).length,
}
assert.equal(summary.withBothImplementations, summary.withDefaultHash)
const directory = 'artifacts/goal-checks/scalar-hash'
await mkdir(directory, { recursive: true })
await writeFile(
  directory + '/inventory.json',
  JSON.stringify({ summary, profiles }, null, 2) + '\n',
)
console.log(JSON.stringify(summary))
