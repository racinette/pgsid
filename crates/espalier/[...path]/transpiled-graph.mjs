import { checkSourceGraph } from '../../../tools/check-transpiler/dialects/source-graph.mjs'

export const description = 'the linked graph of transpiled modules'
export const guidance = `
The modules the manifest names link into one graph the CHECK transpiler
accepts: its syntax, types and ownership, and each module referring only to the
modules it declares. The generated tables link in as the asset build produces
them. A rejection is reported at the item the transpiler stopped at, or on the
manifest when no single item failed.
`
export const aggregate = true
export const targets = ['check-sources.json', '**/*.rs']

export async function lint({ read, files, emit, addons }) {
  const graph = await checkSourceGraph(JSON.parse(await read('check-sources.json')), {
    list: (directory) => files(`${directory}/*.rs`),
    read,
    generated: addons.generated,
  })
  const { error } = addons.parse(graph)
  if (error === undefined) return
  const located = /^crates\/([^:]+?)(?::(\d+):(\d+))?: ([^]*)$/.exec(error)
  if (!located)
    return emit({ code: 'outside_transpiler_dialect', message: error, path: 'check-sources.json' })
  const [, path, line, column, message] = located
  emit({
    code: 'outside_transpiler_dialect',
    message,
    path,
    ...(line && { line: Number(line), column: Number(column) }),
  })
}
