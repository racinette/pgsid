import { afterAll, beforeAll, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'
import { writeGoModule } from '../support/go-module.js'

const run = promisify(execFile)

const schema = `CREATE TYPE mood AS ENUM ('calm', 'tense');
CREATE TYPE moodrange AS RANGE (subtype = mood);
CREATE DOMAIN positive AS integer CHECK (VALUE > 0);
CREATE TYPE pair AS (left_side integer, right_side positive, label varchar(3));
CREATE TABLE containers (
  span int4range,
  stamps tstzrange,
  moods moodrange,
  many int4multirange,
  items integer[],
  grid integer[],
  positives positive[],
  pairs pair[],
  one pair,
  short varchar(3),
  labels varchar(3)[],
  bypass boolean,
  CONSTRAINT span_lower CHECK (lower(span) > 0),
  CONSTRAINT stamps_bounded CHECK (NOT upper_inf(stamps)),
  CONSTRAINT moods_calm CHECK (lower(moods) = 'calm'),
  CONSTRAINT many_five CHECK (many @> 5),
  CONSTRAINT items_short CHECK (cardinality(items) < 5),
  CONSTRAINT grid_small CHECK (cardinality(grid) < 5),
  CONSTRAINT positives_present CHECK (positives IS NOT NULL),
  CONSTRAINT pairs_first CHECK (pairs[1] IS NULL OR (pairs[1]).left_side > 0),
  CONSTRAINT one_right CHECK ((one).right_side > 1),
  CONSTRAINT short_abc CHECK (CASE WHEN bypass THEN true ELSE short = 'abc' END),
  CONSTRAINT labels_abc CHECK (CASE WHEN bypass THEN true ELSE labels[1] = 'abc' END)
);
`

// What the server does with each value the Go test supplies, written as the text the server reads
// a parameter as (a record's literal, not an explicit cast), so the Go results are compared with
// PostgreSQL's own.
const valid = {
  span: "'[1,10)'",
  stamps: "'[2020-01-01 00:00:00+00,2021-01-01 00:00:00+00)'",
  moods: "'[calm,tense]'",
  many: "'{[1,10)}'",
  items: "'{1,2}'",
  grid: "'{{1,2},{3,4}}'",
  positives: "'{1,2}'",
  pairs: `'{"(1,2,abc)"}'`,
  one: "'(1,2,ab)'",
  short: "'abc'",
  labels: "'{abc}'",
  bypass: 'false',
}
const insert = (values: Partial<Record<keyof typeof valid, string>>) => {
  const row = { ...valid, ...values }
  return `INSERT INTO containers (${Object.keys(row).join(',')}) VALUES (${Object.values(row).join(',')})`
}
// Each case's server outcome: null for an accepted row, else the SQLSTATE.
const cases: [string, Partial<Record<keyof typeof valid, string>>, string | null][] = [
  ['valid', {}, null],
  ['canonical span', { span: "'(0,5]'" }, null],
  ['reversed span', { span: "'[5,1)'" }, '22000'],
  ['unbounded stamps', { stamps: "'[2020-01-01 00:00:00+00,)'" }, '23514'],
  ['domain element', { positives: "'{1,-1}'" }, '23514'],
  ['domain field', { pairs: `'{"(1,-1,)"}'` }, '23514'],
  ['long label', { one: "'(1,2,abcd)'" }, '22001'],
  ['long short past CASE', { short: "'abcd'", bypass: 'true' }, '22001'],
  ['trailing spaces', { short: "'abc   '" }, null],
  // An array's modifier applies to each element as an assignment applies it: a value too long is
  // refused, not cut.
  ['long label element past CASE', { labels: "'{abc,abcd}'", bypass: 'true' }, '22001'],
  ['trailing spaces element', { labels: `'{"abc   "}'` }, null],
  ['short label element', { labels: "'{ab}'" }, '23514'],
  ['NULL items', { items: 'NULL' }, null],
  ['empty multirange', { many: "'{}'" }, '23514'],
  ['ragged grid', { grid: "'{{1,2},{3}}'" }, '22P02'],
  ['one-dimensional grid', { grid: "'{1,2,3}'" }, null],
]

const goTest = `package public

import (
	"testing"
	"time"

	pgsid "example.com/pgsid-containers/generated/pgsid"
)

func ptr[T any](value T) *T { return &value }
func results(t *testing.T, input PublicContainersCheckInput) map[string]EvalBool {
	t.Helper()
	evaluations, err := EvaluatePublicContainersChecks(input)
	if err != nil {
		t.Fatal(err)
	}
	out := map[string]EvalBool{}
	for _, evaluation := range evaluations {
		out[evaluation.Constraint] = evaluation.Result
	}
	return out
}
func valid() PublicContainersCheckInput {
	start := pgsid.TimestamptzOf(time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC))
	end := pgsid.TimestamptzOf(time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC))
	return PublicContainersCheckInput{
		Span:      KnownCheckValue(ptr(pgsid.RangeOf(pgsid.Inclusive[int32](1), pgsid.Exclusive[int32](10)))),
		Stamps:    KnownCheckValue(ptr(pgsid.RangeOf(pgsid.Inclusive(start), pgsid.Exclusive(end)))),
		Moods:     KnownCheckValue(ptr(pgsid.RangeOf(pgsid.Inclusive(Mood("calm")), pgsid.Inclusive(Mood("tense"))))),
		Many:      KnownCheckValue(ptr(pgsid.Multirange[int32]{pgsid.RangeOf(pgsid.Inclusive[int32](1), pgsid.Exclusive[int32](10))})),
		Items:     KnownCheckValue([]int32{1, 2}),
		Grid:      KnownCheckValue[pgsid.Array1Or2[int32]](pgsid.D2[int32]{{1, 2}, {3, 4}}),
		Positives: KnownCheckValue([]Positive{1, 2}),
		Pairs:     KnownCheckValue([]Pair{{LeftSide: ptr[int32](1), RightSide: ptr[Positive](2), Label: ptr("abc")}}),
		One:       KnownCheckValue(&Pair{LeftSide: ptr[int32](1), RightSide: ptr[Positive](2), Label: ptr("ab")}),
		Short:     KnownCheckValue(ptr("abc")),
		Labels:    KnownCheckValue([]string{"abc"}),
		Bypass:    KnownCheckValue(ptr(false)),
	}
}
// The server's outcome for a case: accepted when every check holds, else the first check's error or
// violation, which is what the test compares with PostgreSQL's.
func outcome(t *testing.T, input PublicContainersCheckInput) string {
	t.Helper()
	evaluations, err := EvaluatePublicContainersChecks(input)
	if err != nil {
		t.Fatal(err)
	}
	failure := ""
	for _, evaluation := range evaluations {
		result := evaluation.Result
		if !result.Certain {
			return "undecided " + evaluation.Constraint
		}
		if result.Value.Error != "" && failure == "" {
			failure = result.Value.Error
		}
	}
	if failure != "" {
		return failure
	}
	for _, evaluation := range evaluations {
		if evaluation.Result.Value.Valid && !evaluation.Result.Value.Value {
			return "23514"
		}
	}
	return ""
}
func TestServerOutcomes(t *testing.T) {
	start := pgsid.TimestamptzOf(time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC))
	cases := map[string]func(*PublicContainersCheckInput){
		"valid": func(*PublicContainersCheckInput) {},
		"canonical span": func(input *PublicContainersCheckInput) {
			input.Span = KnownCheckValue(ptr(pgsid.RangeOf(pgsid.Exclusive[int32](0), pgsid.Inclusive[int32](5))))
		},
		"reversed span": func(input *PublicContainersCheckInput) {
			input.Span = KnownCheckValue(ptr(pgsid.RangeOf(pgsid.Inclusive[int32](5), pgsid.Exclusive[int32](1))))
		},
		"unbounded stamps": func(input *PublicContainersCheckInput) {
			input.Stamps = KnownCheckValue(ptr(pgsid.RangeOf(pgsid.Inclusive(start), pgsid.Unbounded[pgsid.Timestamptz]())))
		},
		"domain element": func(input *PublicContainersCheckInput) { input.Positives = KnownCheckValue([]Positive{1, -1}) },
		"domain field": func(input *PublicContainersCheckInput) {
			input.Pairs = KnownCheckValue([]Pair{{LeftSide: ptr[int32](1), RightSide: ptr[Positive](-1)}})
		},
		"long label": func(input *PublicContainersCheckInput) {
			input.One = KnownCheckValue(&Pair{LeftSide: ptr[int32](1), RightSide: ptr[Positive](2), Label: ptr("abcd")})
		},
		"long short past CASE": func(input *PublicContainersCheckInput) {
			input.Short = KnownCheckValue(ptr("abcd"))
			input.Bypass = KnownCheckValue(ptr(true))
		},
		"trailing spaces": func(input *PublicContainersCheckInput) { input.Short = KnownCheckValue(ptr("abc   ")) },
		"long label element past CASE": func(input *PublicContainersCheckInput) {
			input.Labels = KnownCheckValue([]string{"abc", "abcd"})
			input.Bypass = KnownCheckValue(ptr(true))
		},
		"trailing spaces element": func(input *PublicContainersCheckInput) { input.Labels = KnownCheckValue([]string{"abc   "}) },
		"short label element":     func(input *PublicContainersCheckInput) { input.Labels = KnownCheckValue([]string{"ab"}) },
		"NULL items":      func(input *PublicContainersCheckInput) { input.Items = KnownCheckValue[[]int32](nil) },
		"empty multirange": func(input *PublicContainersCheckInput) {
			input.Many = KnownCheckValue(ptr(pgsid.Multirange[int32]{}))
		},
		"ragged grid": func(input *PublicContainersCheckInput) {
			input.Grid = KnownCheckValue[pgsid.Array1Or2[int32]](pgsid.D2[int32]{{1, 2}, {3}})
		},
		"one-dimensional grid": func(input *PublicContainersCheckInput) {
			input.Grid = KnownCheckValue[pgsid.Array1Or2[int32]](pgsid.D1[int32]{1, 2, 3})
		},
	}
	expected := map[string]string{EXPECTED}
	for name, apply := range cases {
		input := valid()
		apply(&input)
		if got := outcome(t, input); got != expected[name] {
			t.Errorf("%s: got %q, the server %q", name, got, expected[name])
		}
	}
}
// A part the conversion cannot decide, such as an enum label the captured catalog does not list,
// leaves every check reading the value undecided rather than decided around that part; an unset
// input leaves only the checks that reach it undecided.
func TestUndecidedParts(t *testing.T) {
	input := valid()
	input.Moods = KnownCheckValue(ptr(pgsid.RangeOf(pgsid.Inclusive(Mood("calm")), pgsid.Inclusive(Mood("unknown")))))
	if r := results(t, input)["moods_calm"]; r.Certain {
		t.Errorf("unknown label part: %+v", r)
	}
	input = valid()
	input.Span = CheckOptional[*pgsid.Range[int32]]{}
	r := results(t, input)
	if r["span_lower"].Certain || !r["items_short"].Certain {
		t.Errorf("unset span: %+v", r)
	}
}
`

let root: string
let pg: PGlite

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-go-check-containers-'))
  pg = await PGlite.create()
  await pg.exec(schema)
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(
    join(root, 'queries/containers.sql'),
    `-- name: InsertContainer :exec\n${insert(Object.fromEntries(Object.keys(valid).map((name) => [name, `@${name}`])))};\n`,
  )
  await writeFile(
    join(root, 'pgsid.yaml'),
    `schema: schema.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    go:
      driver: pgx
      mappings:
        column:
          public.containers.grid: { dimensions: [1, 2] }
      schema: { outDir: generated/schema }
      queries:
        out:
          queries: generated/queries
`,
  )
  await writeGoModule(root, 'example.com/pgsid-containers')
}, 120_000)

afterAll(async () => {
  await pg?.close()
  if (root) await rm(root, { recursive: true, force: true })
})

it('reads public Go containers as the server reads them, part by part', async () => {
  const expected: Record<string, string> = {}
  for (const [name, values, state] of cases) {
    const error = await pg.query(insert(values)).then(
      () => null,
      (error: { code?: string }) => error.code ?? 'unknown',
    )
    expect(error, name).toBe(state)
    expected[name] = state ?? ''
  }
  const built = await buildProject({ baseDirectory: root })
  expect(built.state.diagnostics).toEqual([])
  await writeFile(
    join(root, 'generated/schema/public/containers_test.go'),
    goTest.replace(
      'EXPECTED',
      Object.entries(expected)
        .map(([name, state]) => `${JSON.stringify(name)}: ${JSON.stringify(state)}`)
        .join(', '),
    ),
  )
  await run('go', ['vet', './...'], { cwd: root }).catch(
    (error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    },
  )
  await run('go', ['test', '-count=1', './generated/schema/public/'], { cwd: root }).catch(
    (error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    },
  )
}, 600_000)
