export const description =
  'exact digit arithmetic each translated target runs with its own big integers'
export const guidance = `
Functions here compute integer results with exactly one correct value, such as
the product or truncated quotient of base-10000 digit vectors, so every correct
implementation returns the same digits. The Rust bodies are the reference and
run natively; the Go and TypeScript language runtimes implement each function
by hand with their own big integers, and translation calls those instead of the
Rust body. Nothing that depends on PostgreSQL's behaviour, floating point or a
setting belongs here: such code stays in the operations, translated from one
source. Each function is public, takes and returns digit vectors, has a
counterpart under the same name in both language runtimes, and is compared
across all three by the kernel equivalence suite.
`

export async function lint({ path, read, emit }) {
  const manifest = JSON.parse(await read('check-sources.json'))
  if (!manifest.modules.some((module) => module.files.some((entry) => entry.kernels === path)))
    emit({
      code: 'unlisted_kernels',
      message: `the manifest lists ${path} as no module's kernels entry`,
    })
}
