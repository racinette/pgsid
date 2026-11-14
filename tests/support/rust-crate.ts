import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const fixture = new URL('../fixtures/rust/', import.meta.url)

// A Rust crate for generated code, with the fixture's dependencies and lockfile, which the local
// cargo registry already holds, so it builds offline.
export async function writeRustCrate(directory: string): Promise<void> {
  await mkdir(join(directory, 'src'), { recursive: true })
  await copyFile(new URL('Cargo.toml', fixture), join(directory, 'Cargo.toml'))
  await copyFile(new URL('Cargo.lock', fixture), join(directory, 'Cargo.lock'))
}
