export const description = 'runtime semantics of the transpiled `checkruntime` module'
export const guidance =
  'The manifest lists the file under the module the crate root includes it in.'

export async function lint({ path, read, emit }) {
  const manifest = JSON.parse(await read('check-sources.json'))
  if (!manifest.modules.some((module) => module.files.includes(path)))
    emit({ code: 'unlisted_source', message: `the manifest lists no module holding ${path}` })
}
