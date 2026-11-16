import { checkSourceGraph } from '../../../tools/check-transpiler/dialects/source-graph.mjs'

export const description = 'the linked graph of transpiled modules'
export const guidance = `
The modules the manifest names link into one graph the CHECK transpiler
accepts: its syntax, types and ownership, and each module referring only to the
modules it declares. The generated tables link in as the asset build produces
them. A rejection names its file when the transpiler reports one.
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
  const located = /^crates\/([^:]+): ([^]*)$/.exec(error)
  emit({
    code: 'outside_transpiler_dialect',
    message: located ? located[2] : error,
    path: located ? located[1] : 'check-sources.json',
  })
}
