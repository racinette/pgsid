import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'
import { callableIdentity } from '../src/postgres/builtins/catalog.js'
import {
  builtinDomain,
  domainExportName,
  typeFamily as catalogTypeFamily,
} from '../src/postgres/builtins/taxonomy.js'
import type {
  BuiltinCallable,
  BuiltinDomain,
  TypeNames,
} from '../src/postgres/builtins/taxonomy.js'
export {
  TYPE_FAMILIES,
  DOMAIN_FAMILIES,
  GROUPING_RULES,
} from '../src/postgres/builtins/taxonomy.js'
export type { BuiltinCallable } from '../src/postgres/builtins/taxonomy.js'
import { PG18_TYPE_NAMES } from '../src/postgres/builtins/type-names.generated.js'

export type GroupRule = 'comparison' | 'predicate' | 'value' | 'signature-profile'

export const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export const typeFamily = (type: string, typeNames: TypeNames = PG18_TYPE_NAMES): string =>
  catalogTypeFamily(type, typeNames)

export interface GroupClassification {
  id: string
  domain: BuiltinDomain
  schema: string
  kind: BuiltinCallable['kind']
  rule: GroupRule
  inputs: readonly string[]
  output: string
  execution: string
}

function executionShape(callable: BuiltinCallable): string {
  if (callable.kind === 'aggregate') {
    return callable.aggKind === 'o'
      ? 'ordered-set'
      : callable.aggKind === 'h'
        ? 'hypothetical-set'
        : 'normal'
  }
  if (callable.kind === 'window') return 'window'
  return callable.returnsSet ? 'set-returning' : 'scalar'
}

export function classifyBuiltin(
  callable: BuiltinCallable,
  typeNames: TypeNames = PG18_TYPE_NAMES,
): GroupClassification {
  const families = callable.args.map((type) => typeFamily(type, typeNames))
  const inputs = [...new Set(families)].sort(compareText)
  const output = typeFamily(callable.result, typeNames)
  let rule: GroupRule = 'signature-profile'
  if (callable.kind === 'operator') {
    rule =
      callable.result === 'pg_catalog.bool'
        ? callable.args.length === 2 && families[0] === families[1]
          ? 'comparison'
          : 'predicate'
        : 'value'
  }
  const execution = executionShape(callable)
  const classification = {
    domain: builtinDomain(callable, typeNames),
    schema: callable.schema,
    kind: callable.kind,
    rule,
    inputs,
    output,
    execution,
  }
  return {
    ...classification,
    id: classification.domain,
  }
}

export interface BuiltinGroup {
  id: string
  domain: BuiltinDomain
  label: string
  members: readonly { signature: string; callable: BuiltinCallable }[]
}

export function groupBuiltins(
  callables: readonly BuiltinCallable[],
  typeNames: TypeNames = PG18_TYPE_NAMES,
): BuiltinGroup[] {
  const groups = new Map<string, BuiltinGroup>()
  const seen = new Set<string>()
  for (const callable of callables) {
    const signature = callableIdentity(callable)
    if (seen.has(signature)) throw new Error(`Duplicate callable identity: ${signature}`)
    seen.add(signature)
    const classification = classifyBuiltin(callable, typeNames)
    const existing = groups.get(classification.id)
    const members = [...(existing?.members ?? []), { signature, callable }]
    groups.set(classification.id, {
      id: classification.id,
      domain: classification.domain,
      label: classification.domain,
      members,
    })
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      members: [...group.members].sort((a, b) => compareText(a.signature, b.signature)),
    }))
    .sort((a, b) => compareText(a.id, b.id))
}

export function displayCallable(callable: BuiltinCallable): string {
  const displayType = (type: string) =>
    PG18_TYPE_NAMES[type as keyof typeof PG18_TYPE_NAMES] ?? type
  const args =
    callable.kind === 'operator'
      ? [callable.left, callable.right].map((type) => (type === null ? '' : displayType(type)))
      : callable.args.map(displayType)
  return `${callable.schema}.${callable.name}(${args.join(', ')}) -> ${displayType(callable.result)}`
}

export async function checkGroupDeclarations(groups: readonly BuiltinGroup[]): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-builtin-groups-'))
  try {
    const path = join(directory, 'groups.ts')
    const source = groups
      .map((group) => {
        const name = domainExportName(group.domain)
        const inventory = Object.fromEntries(
          group.members.map(({ signature, callable }) => [signature, callable]),
        )
        return `export const ${name} = ${JSON.stringify(inventory)} as const`
      })
      .join('\n')
    await writeFile(path, source)
    const program = ts.createProgram([path], {
      strict: true,
      declaration: true,
      emitDeclarationOnly: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      types: [],
      skipLibCheck: true,
      outDir: join(directory, 'declarations'),
    })
    const emitted = program.emit()
    const diagnostics = [...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics]
    if (diagnostics.length || emitted.emitSkipped) {
      throw new Error(
        diagnostics
          .map(
            (diagnostic) =>
              `${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
          )
          .join('\n') || 'Declaration emission skipped',
      )
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
