export const description = 'Rust crates that run natively and translate to Go and TypeScript'
export const guidance = `
The Rust here runs natively and is also translated to Go and TypeScript by the
CHECK transpiler. The manifest names the modules the transpiler links into one
graph, and the transpiler accepts one Rust dialect across that graph. A module
may be held to a narrower dialect, stated by a constraint beside its files, so
that each module keeps to the constructs its own translation needs.

Crate roots, build scripts and integration tests are native only and are never
translated.
`
