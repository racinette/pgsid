// Manifest paths are relative to the crates directory. The graph names maintained files from the
// repository root and generated tables under generated/ because translation records those paths.
// `list` returns a directory's files, `read` a file's text, and `generated` maps each generated
// table to its source. A kernels file is marked so that translation calls each target's own
// implementation of its functions.
export async function checkSourceGraph(manifest, { list, read, generated }) {
  const modules = []
  for (const module of manifest.modules) {
    const files = []
    for (const entry of module.files) {
      if (typeof entry === 'string') files.push(await maintained(entry, read))
      else if (entry.kernels)
        files.push({ ...(await maintained(entry.kernels, read)), kernels: true })
      else if (entry.directory) {
        const paths = (await list(entry.directory)).filter((path) => path.endsWith('.rs')).sort()
        for (const path of paths) files.push(await maintained(path, read))
      } else {
        const source = generated[entry.generated]
        if (source === undefined) throw new Error(`missing generated table ${entry.generated}`)
        files.push({ path: `generated/${entry.generated}`, source })
      }
    }
    modules.push({ name: module.name, dependencies: module.dependencies, files })
  }
  return { schemaVersion: 1, modules }
}

async function maintained(path, read) {
  return { path: `crates/${path}`, source: await read(path) }
}
