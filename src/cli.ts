import { resolve } from 'node:path'
import type { ProjectBuildUpdate, ProjectDiagnostic } from './project-build.js'
import {
  buildProject,
  ProjectSchemaError,
  watchProject,
  type ProjectRuntime,
  type WatchProjectOptions,
} from './project-runtime.js'

export interface CliEnvironment {
  cwd?: string
  writeOutput?: (content: string) => void
  writeError?: (content: string) => void
  build?: typeof buildProject
  watch?: (options: WatchProjectOptions) => Promise<ProjectRuntime>
  waitForShutdown?: () => Promise<void>
}

interface CliArguments {
  command: 'check' | 'watch'
  configPath?: string
  strict: boolean
  help: boolean
}

class CliUsageError extends Error {}

const usage = `Usage: pgsid [check|watch] [options]

Commands:
  check             Build the project once (default)
  watch             Rebuild when project inputs change

Options:
  -c, --config PATH Use a specific pgsid.yaml file
  --strict          Treat analysis warnings as errors
  -h, --help        Show this help
`

export async function runCli(
  argv: readonly string[],
  environment: CliEnvironment = {},
): Promise<number> {
  const writeOutput = environment.writeOutput ?? ((content) => process.stdout.write(content))
  const writeError = environment.writeError ?? ((content) => process.stderr.write(content))
  let args: CliArguments
  try {
    args = parseArguments(argv, environment.cwd ?? process.cwd())
  } catch (error) {
    writeError(`${errorMessage(error)}\n\n${usage}`)
    return 2
  }
  if (args.help) {
    writeOutput(usage)
    return 0
  }

  const runtimeOptions = args.configPath
    ? { configPath: args.configPath }
    : { baseDirectory: environment.cwd ?? process.cwd() }
  let reportedError: unknown
  try {
    if (args.command === 'check') {
      const update = await (environment.build ?? buildProject)(runtimeOptions)
      writeOutput(formatUpdate(update, args.strict))
      return hasErrors(update, args.strict) ? 1 : 0
    }

    let failed = false
    const runtime = await (environment.watch ?? watchProject)({
      ...runtimeOptions,
      onUpdate: (update) => {
        failed = hasErrors(update, args.strict)
        writeOutput(formatUpdate(update, args.strict))
      },
      onError: (error) => {
        failed = true
        reportedError = error
        writeError(formatFailure(error))
      },
    })
    try {
      await (environment.waitForShutdown ?? waitForShutdown)()
    } finally {
      await runtime.close()
    }
    return failed ? 1 : 0
  } catch (error) {
    if (error !== reportedError) writeError(formatFailure(error))
    return 1
  }
}

const parseArguments = (argv: readonly string[], cwd: string): CliArguments => {
  let command: CliArguments['command'] = 'check'
  let commandSeen = false
  let configPath: string | undefined
  let strict = false
  let help = false

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!
    if (argument === 'check' || argument === 'watch') {
      if (commandSeen) throw new CliUsageError(`Unexpected command ${JSON.stringify(argument)}`)
      command = argument
      commandSeen = true
    } else if (argument === '-h' || argument === '--help') {
      help = true
    } else if (argument === '--strict') {
      strict = true
    } else if (argument === '-c' || argument === '--config') {
      const value = argv[++index]
      if (!value || value.startsWith('-')) {
        throw new CliUsageError(`${argument} requires a path`)
      }
      if (configPath) throw new CliUsageError('The config path was specified more than once')
      configPath = resolve(cwd, value)
    } else if (argument.startsWith('--config=')) {
      const value = argument.slice('--config='.length)
      if (!value) throw new CliUsageError('--config requires a path')
      if (configPath) throw new CliUsageError('The config path was specified more than once')
      configPath = resolve(cwd, value)
    } else {
      throw new CliUsageError(`Unknown argument ${JSON.stringify(argument)}`)
    }
  }
  return { command, configPath, strict, help }
}

const formatUpdate = (update: ProjectBuildUpdate, strict: boolean): string => {
  const diagnostics = update.state.diagnostics.map((diagnostic) =>
    formatDiagnostic(diagnostic, strict),
  )
  const severities = update.state.diagnostics.map((diagnostic) =>
    diagnosticSeverity(diagnostic, strict),
  )
  const errors = severities.filter((severity) => severity === 'error').length
  const warnings = severities.filter((severity) => severity === 'warning').length
  const information = severities.filter((severity) => severity === 'info').length
  if (diagnostics.length === 0) return 'pgsid: check passed\n'
  return `${diagnostics.join('\n')}\npgsid: ${errors} error(s), ${warnings} warning(s), ${information} info\n`
}

const formatDiagnostic = (item: ProjectDiagnostic, strict: boolean): string => {
  const severity = diagnosticSeverity(item, strict)
  if (item.source === 'schema') {
    const range = item.diagnostic.range
    const location = item.path
      ? `${item.path}${range ? `:${range.start}-${range.end}` : ''}`
      : '<schema>'
    return `${location}: ${severity} ${item.diagnostic.code ?? 'schema'}: ${item.diagnostic.message}`
  }
  if (item.source === 'query') {
    return `${item.path}:${item.diagnostic.start}-${item.diagnostic.end}: ${severity} ${item.diagnostic.code}: ${item.diagnostic.message}`
  }
  return `${displayQueryId(item.queryId)}: ${severity} ${item.diagnostic.code}: ${item.diagnostic.message}`
}

const hasErrors = (update: ProjectBuildUpdate, strict: boolean): boolean =>
  update.state.diagnostics.some((diagnostic) => isError(diagnostic, strict))

const isError = (item: ProjectDiagnostic, strict: boolean): boolean =>
  diagnosticSeverity(item, strict) === 'error'

const diagnosticSeverity = (
  item: ProjectDiagnostic,
  strict: boolean,
): 'error' | 'warning' | 'info' => {
  if (item.source === 'query') return 'error'
  if (strict && item.source === 'analysis' && item.diagnostic.severity === 'warning') {
    return 'error'
  }
  return item.diagnostic.severity
}

const formatFailure = (error: unknown): string => {
  if (error instanceof ProjectSchemaError) {
    return `${error.diagnostics
      .map((diagnostic) => {
        const range = diagnostic.range
        const location = `${error.path}${range ? `:${range.start}-${range.end}` : ''}`
        return `${location}: error ${diagnostic.code ?? 'schema'}: ${diagnostic.message}`
      })
      .join('\n')}\n`
  }
  return `pgsid: ${errorMessage(error)}\n`
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const displayQueryId = (queryId: string): string => queryId.replaceAll('\u0000', ':')

const waitForShutdown = (): Promise<void> =>
  new Promise((done) => {
    const finish = (): void => {
      process.off('SIGINT', finish)
      process.off('SIGTERM', finish)
      done()
    }
    process.once('SIGINT', finish)
    process.once('SIGTERM', finish)
  })
