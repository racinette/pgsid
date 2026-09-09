export const description = 'the process-isolated PGlite evaluator worker'

export const rule = `Keep this worker directly loadable by Node without a
TypeScript loader. It owns the isolated PGlite execution half of the killable
evaluator protocol; timeout policy and lifecycle orchestration remain in the
TypeScript parent.`

export async function lint() {}
