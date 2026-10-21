import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { textRangeSchema } from './check-text-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'

it.each([
  { declared: true, utf8: true },
  { declared: false, utf8: true },
  { declared: true, utf8: false },
])(
  'retains text range structural results and reached comparison deferral with context %j',
  async ({ declared, utf8 }) => {
    const pg = await PGlite.create(),
      directory = await mkdtemp(join(tmpdir(), 'pgsid-text-range-context-'))
    try {
      await pg.exec(
        textRangeSchema +
          `CREATE COLLATION "Text.Range".copied FROM "C";
   CREATE TYPE "Text.Range".copied_words AS RANGE(subtype=text,collation="Text.Range".copied,multirange_type_name=copied_sets);
   CREATE FUNCTION "Text.Range".reverse(text,text) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS $$SELECT bttextcmp($2 COLLATE "C",$1 COLLATE "C")$$;
   CREATE OPERATOR CLASS "Text.Range".reverse_ops FOR TYPE text USING btree AS OPERATOR 1 >,OPERATOR 2 >=,OPERATOR 3 =,OPERATOR 4 <=,OPERATOR 5 <,FUNCTION 1 "Text.Range".reverse(text,text);
   CREATE TYPE "Text.Range".reverse_words AS RANGE(subtype=text,collation="C",subtype_opclass="Text.Range".reverse_ops,multirange_type_name=reverse_word_sets);`,
      )
      const initial = await snapshotCatalog(pg),
        profiles = customRangeProfiles(initial).filter((profile) => profile.name !== 'bound_words')
      const families = profiles.flatMap((profile, index) =>
        [false, true].map((multi) => ({
          profile,
          multi,
          index: index * 2 + Number(multi),
          type: multi ? profile.multirange : profile.identity,
          unavailable:
            !utf8 ||
            profile.name === 'reverse_words' ||
            profile.name === 'copied_words' ||
            (profile.name === 'default_words' && !declared),
        })),
      )
      const forms = families.flatMap((family) => {
        const fn = initial.rangeTypes
            .find((profile) => profile.identity === family.profile.identity)!
            .callables!.find(
              (fn) =>
                fn.implementation ===
                (family.multi ? 'multirange_constructor2' : 'range_constructor3'),
            )!,
          name = [fn.schema, fn.name].map(quote).join('.')
        return Object.entries({
          structural: 'isempty(v)::text',
          bound: 'lower(v)::text',
          render: 'v::text',
          compare: '(v=v)::text',
          hash: `hash_${family.multi ? 'multirange' : 'range'}(v)::text`,
          input: `(payload::${family.type})::text`,
          construct: family.multi
            ? `${name}(range_merge(v),range_merge(v))::text`
            : `${name}(first_bound,last_bound,flags)::text`,
        }).map(([name, output]) => ({
          ...family,
          missingHashMetadata: false,
          name,
          output,
          table: `text_context_${family.index}_${name}`,
          sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        }))
      })
      forms.push(
        ...forms
          .filter((form) => form.profile.name === 'copied_words' && form.name === 'hash')
          .map((form) => ({
            ...form,
            missingHashMetadata: true,
            name: 'unproven_hash',
            table: form.table + '_unproven',
          })),
      )
      for (const form of forms)
        await pg.exec(
          `CREATE TABLE ${form.table}(v ${form.type},payload text,first_bound text,last_bound text,flags text,expected text,bypass bool,CONSTRAINT matches CHECK(${form.sql}))`,
        )
      const catalog = await snapshotCatalog(pg)
      const plans = forms.flatMap((form) => {
        const table = catalog.tables.find((table) => table.name === form.table)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { ...table.constraints[0]!, definition: `CHECK(${form.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              form.missingHashMetadata
                ? catalog.rangeTypes.map((profile) =>
                    profile.identity === form.profile.identity
                      ? { ...profile, collationDeterministic: null }
                      : profile,
                  )
                : catalog.rangeTypes,
            )!.expression,
          ),
        }))
      })
      const group = prepareCheckRustGroup(plans, {
        ...(utf8 ? { serverEncoding: 'UTF8' as const } : {}),
        nativeByteOrder: 'little',
        ...(declared ? { defaultCollation: 'C' as const } : {}),
      })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1500),
        ).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const family of families)
        for (const sample of [
          { value: null, first: null, last: null, flags: '[]', bad: false },
          { value: 'empty', first: null, last: null, flags: '[]', bad: false },
          { value: '(,)', first: null, last: null, flags: '[]', bad: false },
          { value: '[a,z]', first: 'a', last: 'z', flags: '[]', bad: false },
          { value: '[é,漢]', first: 'é', last: '漢', flags: '[]', bad: false },
          { value: '[a,z]', first: 'a', last: 'z', flags: 'bad', bad: true },
          { value: '[a,z]', first: null, last: null, flags: null, bad: false },
        ]) {
          const reverse = family.profile.name === 'reverse_words',
            raw =
              reverse && sample.value === '[a,z]'
                ? '[z,a]'
                : reverse && sample.value === '[é,漢]'
                  ? '[漢,é]'
                  : sample.value,
            value = family.multi && raw !== null ? (raw === 'empty' ? '{}' : `{${raw}}`) : raw,
            payload = sample.bad ? 'bad' : value,
            first = reverse ? sample.last : sample.first,
            last = reverse ? sample.first : sample.last,
            v = family.multi
              ? await readMultirangeFixture(pg, family.profile.multirangeType, value)
              : await readRangeFixture(
                  pg,
                  `SELECT $1::${family.type} span`,
                  'span',
                  family.profile.rangeType,
                  [value],
                )
          for (const form of forms.filter((form) => form.index === family.index)) {
            let output: string | null = null,
              failure: string | undefined
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${form.output}) value FROM(SELECT $1::${family.type} v,$2::text payload,$3::text first_bound,$4::text last_bound,$5::text flags)q`,
                  [value, payload, first, last, sample.flags],
                )
              ).rows[0]!.value
            } catch (error) {
              failure = (error as { code: string }).code
            }
            for (const bypass of [false, true])
              for (const wrong of [false, true]) {
                const expected = wrong ? '!different!' : output
                let native: Outcome
                try {
                  const result = (
                    await pg.query<{ value: boolean | null }>(
                      `INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING (${form.sql}) value`,
                      [value, payload, first, last, sample.flags, expected, bypass],
                    )
                  ).rows[0]!.value
                  native = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
                } catch (error) {
                  const code = (error as { code: string }).code
                  native =
                    code === '23514' && (error as { constraint?: string }).constraint === 'matches'
                      ? { kind: 'False' }
                      : { kind: 'Error', value: { state: parseInt(code, 36) } }
                }
                const finite = raw !== null && raw !== 'empty' && raw !== '(,)'
                const reached =
                  (form.missingHashMetadata && finite) ||
                  (!utf8 && form.name === 'hash' && raw !== null && /[^\x00-\x7f]/u.test(raw)) ||
                  (family.unavailable &&
                    ((['compare', 'input'].includes(form.name) && finite) ||
                      (form.name === 'construct' &&
                        (family.multi ? finite : first !== null && last !== null))))
                const row: Row = {
                  v: v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
                  payload: cell(payload),
                  first_bound: cell(first),
                  last_bound: cell(last),
                  flags: cell(sample.flags),
                  expected: cell(expected),
                  bypass: cell(bypass),
                }
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: form.table + '_' + origin,
                    row,
                    expected: !bypass && !failure && reached ? { kind: 'Unknown' } : native,
                  })
              }
          }
        }
      for (const form of forms.filter((form) =>
        ['structural', 'bound', 'render', 'compare', 'hash', 'unproven_hash'].includes(form.name),
      ))
        for (const input of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[])
          for (const bypass of [false, true])
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + origin,
                row: { v: input, expected: cell('anything'), bypass: cell(bypass) },
                expected: bypass ? { kind: 'True' } : (input as Outcome),
              })
      await runCheckParity(
        directory,
        'textcontext' + Number(declared) + Number(utf8),
        group,
        plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  },
  300_000,
)
