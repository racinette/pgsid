import { dirname, relative, sep } from 'node:path'

export const typescriptModuleSpecifier = (source: string, destination: string): string => {
  let path = relative(dirname(source), destination)
    .split(sep)
    .join('/')
    .replace(/(?:\.d)?\.ts$/u, '.js')
  if (!path.startsWith('.')) path = `./${path}`
  return path
}
export const typescriptSchemaDirectory = (schema: string): string =>
  encodeURIComponent(schema).replaceAll('.', '%2E')
