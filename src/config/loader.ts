import { readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { configSchema, type Config } from './schema.js'

export interface LoadConfigOptions {
  configPath?: string
}

export function loadConfig(opts: LoadConfigOptions = {}): Config {
  const path = opts.configPath ?? findConfigPath()
  const raw = readFileSync(path, 'utf-8')
  return parseConfigString(raw, path)
}

export function parseConfigString(raw: string, path = '<string>'): Config {
  const yaml = parseYaml(raw)
  const result = configSchema.safeParse(yaml)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  at ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new ConfigError(`Invalid config in ${path}:\n${issues}`)
  }
  return result.data
}

export function findConfigPath(cwd: string = process.cwd()): string {
  const candidates = ['pgsid.yaml', 'pgsid.yml']
  for (const c of candidates) {
    try {
      const stat = readFileSync(cwd + '/' + c)
      if (stat) return cwd + '/' + c
    } catch {
      // try next
    }
  }
  throw new ConfigError(`No pgsid.yaml found in ${cwd}`)
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}
