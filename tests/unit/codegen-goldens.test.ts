import { execFile, spawnSync } from 'node:child_process'
import { promisify } from 'node:util'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { parseConfigString } from '../../src/config/loader.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { buildProject } from '../../src/project-runtime.js'

const fixtureRoot = fileURLToPath(new URL('../fixtures/codegen', import.meta.url))
const projects: {
  name: string
  source: string
  expected: string
  nativeTests: boolean
  config?: string
  nullTests?: boolean
  jsonTests?: boolean
  validationTests?: boolean
  inputTests?: boolean
  standaloneTests?: boolean
}[] = [
  {
    name: 'standalone Go validators without executors',
    source: 'inputs/project',
    expected: 'inputs/standalone-expected',
    nativeTests: false,
    config: 'standalone.yaml',
    standaloneTests: true,
  },
  ...[undefined, 'structs.yaml'].map((config) => ({
    name: `JSON write inputs ${config ?? 'pointers'}`,
    source: 'inputs/project',
    expected: `inputs/${config?.replace('.yaml', '') ?? 'pointers'}-expected`,
    nativeTests: false,
    config,
    inputTests: true,
  })),
  ...[undefined, 'structs.yaml', 'overrides.yaml'].map((config) => ({
    name: `Go runtime validation ${config ?? 'pointers'}`,
    source: 'validation/project',
    expected: `validation/${config?.replace('.yaml', '') ?? 'pointers'}-expected`,
    nativeTests: false,
    config,
    validationTests: true,
  })),
  {
    name: 'Go null pointers without schema output',
    source: 'nulls/project',
    expected: 'nulls/query-only-pointers-expected',
    nativeTests: false,
    config: 'query-only-pointers.yaml',
  },
  {
    name: 'Go null structs without schema output',
    source: 'nulls/project',
    expected: 'nulls/query-only-expected',
    nativeTests: false,
    config: 'query-only.yaml',
  },
  { name: 'mixed targets', source: 'project', expected: 'expected', nativeTests: true },
  {
    name: 'Go schema names',
    source: 'schema-names/project',
    expected: 'schema-names/expected',
    nativeTests: false,
  },
  {
    name: 'Go null structs',
    source: 'nulls/project',
    expected: 'nulls/expected',
    nativeTests: false,
    nullTests: true,
  },
  {
    name: 'Go null pointers',
    source: 'nulls/project',
    expected: 'nulls/pointers-expected',
    nativeTests: false,
    config: 'pointers.yaml',
  },
  {
    name: 'Go structs with JSON pointers',
    source: 'nulls/project',
    expected: 'nulls/json-pointers-expected',
    nativeTests: false,
    config: 'json-pointers.yaml',
  },
  {
    name: 'Go pointers with JSON structs',
    source: 'nulls/project',
    expected: 'nulls/json-structs-expected',
    nativeTests: false,
    config: 'json-structs.yaml',
    jsonTests: true,
  },
]
const roots: string[] = []
const goBinary = process.env['PGSID_GO_BINARY'] ?? 'go'
const goAvailable = spawnSync(goBinary, ['version'], { encoding: 'utf8' }).status === 0
const runFile = promisify(execFile)

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('codegen project goldens', () => {
  it.skipIf(!goAvailable).each(projects)(
    'compiles the generated Go schema and query packages: $name',
    async (project) => {
      const root = await mkdtemp(join(tmpdir(), 'pgsid-codegen-go-'))
      roots.push(root)
      await cp(join(fixtureRoot, project.source), root, { recursive: true })
      if (project.config) await cp(join(root, project.config), join(root, 'pgsid.yaml'))
      const update = await buildProject({ baseDirectory: root })
      expect(update.state.diagnostics).toEqual([])
      if (project.nativeTests) {
        await cp(join(fixtureRoot, 'go-tests/events'), join(root, 'generated/go/queries/events'), {
          recursive: true,
        })
        await writeFile(
          join(root, 'generated/go/queries/admin/events/generated_test.go'),
          `package events
import "testing"
func TestQueryDeclarations(t *testing.T) {
  _ = GetEventLinuxRow{}
  _ = GetEventTestRow{}
  _ = HiddenRow{}
}
`,
        )
      }
      if (project.nullTests)
        await cp(join(fixtureRoot, 'nulls/go-tests/items'), join(root, 'generated/queries/items'), {
          recursive: true,
        })
      if (project.nullTests)
        await cp(
          join(fixtureRoot, 'nulls/go-tests/documentparts'),
          join(root, 'generated/queries/documentparts'),
          { recursive: true },
        )
      if (project.nullTests || project.jsonTests)
        await cp(
          join(fixtureRoot, 'nulls/go-tests/jsonschemas'),
          join(root, 'generated/jsonschemas'),
          { recursive: true },
        )
      if (project.validationTests)
        await cp(
          join(fixtureRoot, 'validation/go-tests/documents'),
          join(root, 'generated/queries/documents'),
          { recursive: true },
        )
      if (project.validationTests)
        await cp(
          join(fixtureRoot, 'validation/go-tests/support'),
          join(root, 'generated/jsonschemas/pgsid'),
          { recursive: true },
        )
      if (project.inputTests)
        await cp(
          join(fixtureRoot, 'inputs/go-tests/items'),
          join(root, 'generated/queries/items'),
          { recursive: true },
        )
      if (project.inputTests || project.standaloneTests)
        await cp(
          join(fixtureRoot, 'inputs/go-tests/jsonschemas'),
          join(root, 'generated/jsonschemas'),
          { recursive: true },
        )
      const result = await runFile(
        goBinary,
        [
          'test',
          ...(project.validationTests || project.inputTests || project.standaloneTests
            ? ['-race']
            : []),
          '-mod=readonly',
          './generated/...',
        ],
        {
          cwd: root,
          env: {
            ...process.env,
            GOCACHE: join(tmpdir(), 'pgsid-codegen-go-cache'),
            GOTOOLCHAIN: 'local',
          },
          timeout: 60_000,
        },
      ).catch((error: unknown) => {
        if (typeof error === 'object' && error !== null && 'stdout' in error && 'stderr' in error) {
          throw new Error(
            `Generated Go tests failed:\n${String(error.stdout)}\n${String(error.stderr)}`,
            { cause: error },
          )
        }
        throw error
      })
      expect(result.stderr).toBe('')
      if (project.inputTests || project.standaloneTests) {
        const dependencies = await runFile(
          goBinary,
          ['list', '-deps', '-mod=readonly', './generated/jsonschemas'],
          {
            cwd: root,
            env: {
              ...process.env,
              GOTOOLCHAIN: 'local',
              GOCACHE: join(tmpdir(), 'pgsid-codegen-go-cache'),
            },
            timeout: 60_000,
          },
        )
        expect(dependencies.stdout).not.toContain('github.com/jackc/pgx')
      }
    },
    65_000,
  )

  it.each(projects)(
    'emits the complete generated tree byte-for-byte: $name',
    async (project) => {
      const root = await mkdtemp(join(tmpdir(), 'pgsid-codegen-golden-'))
      roots.push(root)
      await cp(join(fixtureRoot, project.source), root, { recursive: true })
      if (project.config) await cp(join(root, project.config), join(root, 'pgsid.yaml'))

      const update = await buildProject({ baseDirectory: root })
      expect(update.state.diagnostics).toEqual([])

      if (project.nativeTests) {
        const sourceFiles = (await walk(join(root, 'generated/typescript'))).filter((path) =>
          path.endsWith('.ts'),
        )
        sourceFiles.push(join(root, 'typescript-usage.ts'))
        const program = ts.createProgram(sourceFiles, {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          noEmit: true,
          strict: true,
          skipLibCheck: false,
          types: [],
        })
        expect(
          ts
            .getPreEmitDiagnostics(program)
            .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
        ).toEqual([])
      }
      const actual = await fileTree(join(root, 'generated'))
      if (process.env['UPDATE_CODEGEN_GOLDENS'] === '1') {
        await rm(join(fixtureRoot, project.expected), { recursive: true, force: true })
        await cp(join(root, 'generated'), join(fixtureRoot, project.expected), { recursive: true })
      }
      const expected = await fileTree(join(fixtureRoot, project.expected))
      expect(actual).toEqual(expected)
    },
    20_000,
  )
  it('pins diagnostics for schema directory collisions', async () => {
    const cases = JSON.parse(
      await readFile(join(fixtureRoot, 'schema-names/collisions.json'), 'utf8'),
    ) as {
      name: string
      schemas: string[]
      overrides?: Record<string, string>
    }[]
    const database = await PGlite.create()
    const actual: {
      name: string
      diagnostics: ReturnType<typeof renderGoSchemaArtifacts>['diagnostics']
    }[] = []
    try {
      for (const fixture of cases) {
        await database.exec('BEGIN;')
        for (const schema of fixture.schemas) {
          const identifier = `"${schema.replaceAll('"', '""')}"`
          await database.exec(
            `CREATE SCHEMA IF NOT EXISTS ${identifier}; CREATE DOMAIN ${identifier}.event_id AS bigint;`,
          )
        }
        const config = parseConfigString(`
          schema: schema.sql
          sql:
            codegen:
              go:
                schema:
                  outDir: generated
                  names: ${JSON.stringify(fixture.overrides ?? {})}
        `)
        const result = renderGoSchemaArtifacts(
          await snapshotCatalog(database),
          config,
          {},
          '/generated',
          'example.com/schema-names/generated',
        )
        expect(result.artifacts, fixture.name).toEqual([])
        expect(result.diagnostics, fixture.name).toMatchObject([
          { code: 'generated-name-collision', severity: 'error' },
        ])
        actual.push({ name: fixture.name, diagnostics: result.diagnostics })
        await database.exec('ROLLBACK;')
      }
    } finally {
      await database.close()
    }
    const expectedPath = join(fixtureRoot, 'schema-names/collisions.expected.json')
    if (process.env['UPDATE_CODEGEN_GOLDENS'] === '1') {
      await writeFile(expectedPath, `${JSON.stringify(actual, null, 2)}\n`)
    }
    expect(actual).toEqual(JSON.parse(await readFile(expectedPath, 'utf8')))
  }, 20_000)
})

const fileTree = async (root: string): Promise<Record<string, string>> => {
  const files = await walk(root)
  return Object.fromEntries(
    await Promise.all(
      files.map(async (path) => [normalize(relative(root, path)), await readFile(path, 'utf8')]),
    ),
  )
}

const walk = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(root, entry.name)
      return entry.isDirectory() ? walk(path) : Promise.resolve([path])
    }),
  )
  return nested.flat().sort()
}

const normalize = (path: string): string => path.split(sep).join('/')
