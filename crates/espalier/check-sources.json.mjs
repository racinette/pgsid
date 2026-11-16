export const description = 'the manifest of modules the CHECK transpiler links'
export const guidance = `
Names each transpiled module, the modules it may reference, and its files in
order. A file entry is a path relative to this directory, a \`directory\` whose
\`.rs\` files join in name order, or a \`generated\` table the asset build produces.

A module the evaluator's crate root declares lists exactly the files the root
includes into it, and in the root's order unless a directory supplies them. Any
other module is a crate translated whole from its \`src/lib.rs\`.
`

const crateRoot = 'check-evaluator/src/lib.rs'

// Top-level modules of the crate root, with the files each includes: maintained paths, and
// generated tables as `generated:` keys named the way the manifest names them.
function includedModules(root) {
  const modules = new Map()
  let current
  for (const line of root.split('\n')) {
    const opened = /^pub mod (\w+) \{$/.exec(line)
    if (opened) modules.set(opened[1], (current = []))
    else if (line === '}') current = undefined
    else if (current) {
      const maintained = /^\s*include!\("([^"]+)"\);$/.exec(line)
      const generated = /^\s*include!\(concat!\(env!\("OUT_DIR"\), "\/([a-z-]+)\.rs"\)\);$/.exec(
        line,
      )
      if (maintained) current.push(`check-evaluator/src/${maintained[1]}`)
      else if (generated) current.push(`generated:${generated[1].replaceAll('-', '_')}.rs`)
    }
  }
  return modules
}

async function listedFiles(entries, files) {
  const listed = []
  for (const entry of entries) {
    if (typeof entry === 'string') listed.push(entry)
    else if (entry.directory) listed.push(...[...(await files(`${entry.directory}/*.rs`))].sort())
    else listed.push(`generated:${entry.generated}`)
  }
  return listed
}

export async function lint({ read, files, emit }) {
  const manifest = JSON.parse(await read())
  const included = includedModules(await read(crateRoot))
  for (const module of manifest.modules) {
    const listed = await listedFiles(module.files, files)
    const expected = included.get(module.name)
    if (!expected) {
      if (listed.length !== 1 || !/^[^/]+\/src\/lib\.rs$/.test(listed[0]))
        emit({
          code: 'unrooted_module',
          message: `${module.name} is neither a module of ${crateRoot} nor one crate's src/lib.rs`,
        })
      continue
    }
    for (const file of expected.filter((file) => !listed.includes(file)))
      emit({
        code: 'unlisted_include',
        message: `${crateRoot} includes ${file} into ${module.name}, which does not list it`,
      })
    for (const file of listed.filter((file) => !expected.includes(file)))
      emit({
        code: 'listed_without_include',
        message: `${module.name} lists ${file}, which ${crateRoot} does not include into it`,
      })
    const ordered = module.files.every((entry) => !entry.directory)
    if (
      ordered &&
      listed.length === expected.length &&
      listed.some((file, index) => file !== expected[index])
    )
      emit({
        code: 'include_order',
        message: `${module.name} lists its files in a different order from ${crateRoot}`,
      })
  }
  for (const name of included.keys())
    if (!manifest.modules.some((module) => module.name === name))
      emit({
        code: 'missing_module',
        message: `${crateRoot} declares ${name}, which is not listed`,
      })
}
