import { readFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { format } from 'prettier'
import { callableIdentity, readBuiltinCatalog } from '../src/postgres/builtins/catalog.js'
import { builtinDomain, domainExportName } from '../src/postgres/builtins/taxonomy.js'
import type { BuiltinCallable, BuiltinDomain } from '../src/postgres/builtins/taxonomy.js'

const check = process.argv.includes('--check')
const directory = new URL('../src/postgres/builtins/', import.meta.url)
const pg = await PGlite.create()
try {
  const catalog = await readBuiltinCatalog(pg)
  if (Math.floor(catalog.serverVersion / 10000) !== 18) {
    throw new Error(`Expected PostgreSQL 18, received ${catalog.serverVersion}`)
  }
  const typeNames: Record<string, string> = {}
  for (const { metadata, signature } of catalog.functions) {
    metadata.args.forEach((type, index) => {
      typeNames[type] = signature.args[index]!
    })
    typeNames[metadata.result] = signature.returns
  }
  for (const { metadata, signature } of catalog.operators) {
    if (metadata.left !== null) typeNames[metadata.left] = signature.leftType!
    if (metadata.right !== null) typeNames[metadata.right] = signature.rightType!
    typeNames[metadata.result] = signature.returns
  }
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  const sources = new Map<string, string>()
  sources.set(
    'type-names.generated.ts',
    `export const PG18_TYPE_NAMES = ${JSON.stringify(Object.fromEntries(Object.entries(typeNames).sort(([a], [b]) => compare(a, b))))} as const`,
  )
  const groups = new Map<BuiltinDomain, Record<string, BuiltinCallable>>()
  const metadata: BuiltinCallable[] = [
    ...catalog.operators.map((row) => row.metadata),
    ...catalog.functions.map((row) => row.metadata),
  ]
  const seen = new Set<string>()
  for (const row of metadata.sort((a, b) => compare(callableIdentity(a), callableIdentity(b)))) {
    const key = callableIdentity(row)
    if (seen.has(key)) throw new Error(`Duplicate identity: ${key}`)
    seen.add(key)
    const domain = builtinDomain(row, typeNames)
    const entries = groups.get(domain) ?? {}
    entries[key] = row
    groups.set(domain, entries)
  }
  const domains = [...groups.keys()].sort(compare)
  for (const domain of domains) {
    sources.set(
      `${domain}.generated.ts`,
      `export const ${domainExportName(domain)} = ${JSON.stringify(groups.get(domain))} as const`,
    )
  }
  sources.set(
    'groups.generated.ts',
    `import type { BuiltinInventoryGroup } from './taxonomy.js'\n` +
      domains
        .map((domain) => `import { ${domainExportName(domain)} } from './${domain}.generated.js'`)
        .join('\n') +
      '\n' +
      `export const PG18_BUILTINS_VERSION = ${catalog.serverVersion} as const\n` +
      `export const PG18_BUILTIN_GROUPS: readonly BuiltinInventoryGroup[] = [\n` +
      domains
        .map((domain) => `{ domain: '${domain}', inventory: ${domainExportName(domain)} },`)
        .join('\n') +
      '\n]\n',
  )
  if (!check) await mkdir(directory, { recursive: true })
  for (const [name, source] of sources) {
    const formatted = await format(source, {
      parser: 'typescript',
      semi: false,
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 100,
    })
    const path = new URL(name, directory)
    if (check) {
      if ((await readFile(path, 'utf8')) !== formatted) throw new Error(`Stale inventory: ${path}`)
    } else {
      await writeFile(path, formatted)
    }
  }
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.generated.ts') || sources.has(name)) continue
    if (check) throw new Error(`Obsolete inventory: ${name}`)
    await rm(new URL(name, directory))
  }
} finally {
  await pg.close()
}
