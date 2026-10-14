import { it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

it('reuses identical generated Go packages across fixture directories with trimmed paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-go-cache-'))
  const rows: { compiles: number; hash: string }[] = []
  try {
    for (const trimmed of [false, true]) {
      for (const copy of [1, 2]) {
        const directory = join(root, `${trimmed}-${copy}`)
        await mkdir(directory)
        await writeFile(
          join(directory, 'go.mod'),
          'module example.com/pgsid/cacheprobe\n\ngo 1.25\n',
        )
        await writeFile(
          join(directory, 'value.go'),
          'package cacheprobe\n\ntype Value struct { Known bool; Units int64 }\nfunc MakeValue(units int64) Value { return Value{Known:true, Units:units} }\n',
        )
        const result = await promisify(execFile)(
          'go',
          ['build', '-x', '-mod=mod', `-trimpath=${trimmed}`, '-o', 'value.a', '.'],
          {
            cwd: directory,
            env: { ...process.env, GOCACHE: join(root, 'cache'), GOWORK: 'off', GOMAXPROCS: '1' },
          },
        )
        const compiles = result.stderr
          .split('\n')
          .filter(
            (line) =>
              /[/\\]compile(?:\.exe)? /u.test(line) &&
              line.includes(' -p example.com/pgsid/cacheprobe '),
          ).length
        const hash = createHash('sha256')
          .update(await readFile(join(directory, 'value.a')))
          .digest('hex')
        rows.push({ compiles, hash })
      }
    }
    expect(rows.map((row) => row.compiles)).toEqual([1, 1, 1, 0])
    expect(rows[0]!.hash).not.toBe(rows[1]!.hash)
    expect(rows[2]!.hash).toBe(rows[3]!.hash)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
