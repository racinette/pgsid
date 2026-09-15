import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { DiagnosticSeverity } from 'vscode-languageserver'
import {
  projectDiagnosticsToLanguageServer,
  projectFailureToLanguageServer,
} from '../../src/language-server/diagnostics.js'
import { EMPTY_PROJECT_BUILD_STATE, type ProjectBuildState } from '../../src/project-build.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('language-server diagnostics', () => {
  it('maps UTF-8 byte ranges to UTF-16 positions and clears no precision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-lsp-diagnostics-'))
    roots.push(root)
    const path = join(root, 'queries/value.sql')
    const content = 'é🙂 +\n'
    await mkdir(join(root, 'queries'), { recursive: true })
    await writeFile(path, content)
    const start = Buffer.byteLength('é🙂 ', 'utf8')
    const state: ProjectBuildState = {
      ...EMPTY_PROJECT_BUILD_STATE,
      queryBatch: {
        parseCache: {},
        files: {
          'queries/value.sql': {
            path: 'queries/value.sql',
            content,
            contentHash: 'snapshot',
            routes: [],
            queries: [],
            diagnostics: [],
          },
        },
      },
      diagnostics: [
        {
          source: 'query',
          path: 'queries/value.sql',
          diagnostic: { code: 'parse-error', message: 'broken expression', start, end: start + 1 },
        },
      ],
    }
    await writeFile(path, 'changed after analysis')

    const documents = await projectDiagnosticsToLanguageServer(state, {
      baseDirectory: root,
      configPath: join(root, 'pgsid.yaml'),
    })

    expect(documents).toEqual([
      {
        uri: pathToFileURL(path).href,
        diagnostics: [
          {
            range: {
              start: { line: 0, character: 4 },
              end: { line: 0, character: 5 },
            },
            severity: DiagnosticSeverity.Error,
            code: 'parse-error',
            source: 'pgsid',
            message: 'broken expression',
          },
        ],
      },
    ])
  })

  it('turns schema failures into file diagnostics with related locations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-lsp-diagnostics-'))
    roots.push(root)
    const path = join(root, 'migrations/001.sql')
    await mkdir(join(root, 'migrations'), { recursive: true })
    await writeFile(path, 'SELECT broken;')
    const failure = Object.assign(new Error('migration failed'), {
      path: 'migrations/001.sql',
      content: Buffer.from('SELECT broken;'),
      diagnostics: [
        {
          message: 'column does not exist',
          code: '42703',
          severity: 'error' as const,
          hint: undefined,
          detail: undefined,
          range: { start: 7, end: 13 },
          relatedLocations: [{ range: { start: 0, end: 6 }, message: 'statement starts here' }],
          original: { source: 'internal' as const, error: new Error('migration failed') },
        },
      ],
    })
    await writeFile(path, 'changed after validation')

    const documents = await projectFailureToLanguageServer(failure, {
      baseDirectory: root,
      configPath: join(root, 'pgsid.yaml'),
    })

    expect(documents[0]?.diagnostics[0]).toMatchObject({
      range: { start: { line: 0, character: 7 }, end: { line: 0, character: 13 } },
      code: '42703',
      relatedInformation: [
        {
          location: {
            uri: pathToFileURL(path).href,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } },
          },
          message: 'statement starts here',
        },
      ],
    })
  })
})
