export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void
  info(msg: string, ctx?: Record<string, unknown>): void
  warn(msg: string, ctx?: Record<string, unknown>): void
  error(msg: string, ctx?: Record<string, unknown>): void
  child(ctx: Record<string, unknown>): Logger
}

export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return noopLogger
  },
}

export function consoleLogger(level: LogLevel = 'info'): Logger {
  const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
  const minLevel = levels[level]

  function make(
    ctx: Record<string, unknown>,
  ): Logger {
    const log = (lvl: LogLevel) => (msg: string, extra?: Record<string, unknown>) => {
      if (levels[lvl] < minLevel) return
      const all = { ...ctx, ...extra }
      const ctxStr = Object.keys(all).length > 0 ? ' ' + JSON.stringify(all) : ''
      const fn = lvl === 'debug' ? console.debug : lvl === 'info' ? console.info : lvl === 'warn' ? console.warn : console.error
      fn(`[${lvl}] ${msg}${ctxStr}`)
    }
    return {
      debug: log('debug'),
      info: log('info'),
      warn: log('warn'),
      error: log('error'),
      child(extra: Record<string, unknown>) {
        return make({ ...ctx, ...extra })
      },
    }
  }

  return make({})
}
