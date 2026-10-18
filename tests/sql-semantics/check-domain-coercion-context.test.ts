import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'
it('retains catalog coercion context when identical printed domain casts have different INSERT behavior', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-coercion-context-'))
  try {
    const forms = {
      implicit_codes: "cardinality(array_append(ARRAY['abc']::short_code[],'abcd'))=2",
      explicit_codes:
        "cardinality(array_append(ARRAY['abc']::short_code[],('abcd'::varchar)::short_code))=2",
    }
    await pg.exec('CREATE DOMAIN short_code AS varchar(3)')
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`CREATE TABLE ${name}(id integer,CONSTRAINT width_check CHECK(${sql}))`)
    const catalog = await snapshotCatalog(pg),
      entries = []
    expect(
      catalog.tables.find((t) => t.name === 'implicit_codes')!.constraints[0]!.definition,
    ).toBe(catalog.tables.find((t) => t.name === 'explicit_codes')!.constraints[0]!.definition)
    for (const [name, sql] of Object.entries(forms)) {
      const table = catalog.tables.find((t) => t.name === name)!,
        constraint = table.constraints[0]!
      if (name === 'implicit_codes')
        await expect(pg.exec('INSERT INTO implicit_codes VALUES(1)')).rejects.toMatchObject({
          code: '22001',
        })
      else await expect(pg.exec('INSERT INTO explicit_codes VALUES(1)')).resolves.toBeDefined()
      for (const origin of ['source', 'stored'] as const)
        entries.push({
          name: name + '_' + origin,
          expression: lowerTableCheck(
            table,
            origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expected:
            name === 'implicit_codes'
              ? ({ kind: 'Error', value: { state: parseInt('22001', 36) } } as Outcome)
              : ({ kind: 'True' } as Outcome),
        })
    }
    const group = prepareCheckRustGroup(entries, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    expect(group.checks.map((c) => c.kind)).toEqual([
      'supported',
      'supported',
      'supported',
      'supported',
    ])
    await runCheckParity(
      directory,
      'domaincoercioncontext',
      group,
      entries.map((e) => e.name),
      entries.map((e) => ({ name: e.name, row: {}, expected: e.expected })),
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('matches original INSERT behavior for scalar and array coercion modes, nested domain CHECKs and mixed branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-coercion-matrix-'))
  try {
    await pg.exec(`CREATE DOMAIN short_code AS varchar(3);CREATE DOMAIN smaller_code AS varchar(2);
   CREATE DOMAIN short_char AS char(3);CREATE DOMAIN short_bits AS bit(3);CREATE DOMAIN short_varbits AS varbit(3);
   CREATE DOMAIN guarded_number AS integer CHECK(cardinality(array_append(ARRAY['abc']::short_code[],'abcd'))=2)`)
    const implicit = "cardinality(array_append(ARRAY['abc']::short_code[],'abcd'))=2"
    const explicit =
      "cardinality(array_append(ARRAY['abc']::short_code[],('abcd'::varchar)::short_code))=2"
    const forms: Record<string, string> = {
      implicit,
      explicit,
      mixed: `CASE WHEN flag THEN ${implicit} ELSE ${explicit} END`,
      mixed_reverse: `CASE WHEN flag THEN ${explicit} ELSE ${implicit} END`,
      pruned: `CASE WHEN true THEN true ELSE ${implicit} END`,
      varchar_array_implicit: 'cardinality(COALESCE(NULL::short_code[],payload::varchar[]))=2',
      varchar_array_explicit: 'cardinality(payload::varchar[]::short_code[])=2',
      bpchar_implicit: "cardinality(array_append(ARRAY['abc']::short_char[],'abcd'))=2",
      bpchar_explicit:
        "cardinality(array_append(ARRAY['abc']::short_char[],('abcd'::text)::short_char))=2",
      bit_implicit: "cardinality(array_append(ARRAY['101']::short_bits[],'1011'))=2",
      bit_explicit:
        "cardinality(array_append(ARRAY['101']::short_bits[],('1011'::varbit)::short_bits))=2",
      varbit_implicit: "cardinality(array_append(ARRAY['101']::short_varbits[],'1011'))=2",
      varbit_explicit:
        "cardinality(array_append(ARRAY['101']::short_varbits[],('1011'::varbit)::short_varbits))=2",
      constructor_varchar: 'cardinality(ARRAY[payload]::short_code[])=1',
      constructor_bit: 'cardinality(ARRAY[payload::varbit]::short_bits[])=1',
      nested_array: "cardinality((ARRAY[('abcd'::varchar)::short_code])::smaller_code[])=1",
      nested_guard: 'payload::guarded_number>0',
      skipped_guard: 'CASE WHEN flag THEN true ELSE payload::guarded_number>0 END',
      guarded_error_order: '(payload::guarded_number)+(1/0)>0',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE mode_${name}(payload text,flag boolean,CONSTRAINT mode_check CHECK(${sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      entries = Object.entries(forms).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'mode_' + name)!,
          constraint = table.constraints[0]!
        expect(constraint.coercionContext?.complete, name).toBe(true)
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          table: table.name,
          sql,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
          expression: lowerTableCheck(
            table,
            origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        }))
      })
    const group = prepareCheckRustGroup(entries, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, entries[index]!.name + ('reason' in check ? ':' + check.reason : '')).toBe(
        'supported',
      )
    const fixtures: {
        name: string
        row: import('../../tools/check-rust/parity.js').Row
        expected: Outcome
      }[] = [],
      references: unknown[] = []
    for (const [payload, flag] of [
      ['{abc,xyz}', true],
      ['{abcd,xy}', true],
      ['{abc,toolong}', false],
      ['{"雪😊xY",abc}', false],
      [null, true],
      ['1', true],
      ['1011', false],
      ['bad', false],
      ['{NULL,NULL}', true],
      ['{}', false],
    ] as const) {
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ value: boolean | null }>(
              `WITH inputs AS MATERIALIZED (SELECT $1::text payload,$2::boolean flag) SELECT ${sql} value FROM inputs`,
              [payload, flag],
            )
          ).rows[0]!.value
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        await pg.exec('BEGIN')
        try {
          await pg.query(`INSERT INTO mode_${name}(payload,flag) VALUES($1,$2)`, [payload, flag])
          expect(['True', 'Null'], name).toContain(expected.kind)
        } catch (failure) {
          const error = failure as { code: string; constraint?: string }
          expect(error.code, name).toMatch(/^[0-9A-Z]{5}$/u)
          if (error.constraint === 'mode_check') expect(expected, name).toEqual({ kind: 'False' })
          else expected = { kind: 'Error', value: { state: parseInt(error.code, 36) } }
        } finally {
          await pg.exec('ROLLBACK')
        }
        const row = {
          payload:
            payload === null
              ? { kind: 'Null' as const }
              : { kind: 'Value' as const, value: payload },
          flag: { kind: 'Value' as const, value: flag },
        }
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
        references.push({ name, payload, flag, expected })
      }
    }
    console.log(`Catalog coercion modes: ${fixtures.length} cross-target INSERT witnesses`)
    const artifact = process.env['PGSID_COERCION_CONTEXT_ARTIFACTS']
    if (artifact) {
      const { mkdir, writeFile } = await import('node:fs/promises')
      await mkdir(artifact, { recursive: true })
      await writeFile(join(artifact, 'matrix-fixtures.json'), JSON.stringify(fixtures))
      await writeFile(join(artifact, 'matrix-references.json'), JSON.stringify(references))
      await writeFile(join(artifact, 'matrix-plans.json'), JSON.stringify(entries))
    }
    await runCheckParity(
      directory,
      'domaincoercionmodes',
      group,
      entries.map((e) => e.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('defers only mode-sensitive stored conversions when their catalog context is missing or inconsistent', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-missing-context-'))
  try {
    await pg.exec(`CREATE DOMAIN short_code AS varchar(3);CREATE DOMAIN short_amount AS numeric(4,1);
   CREATE TABLE missing_context(payload text,labels text,
    CONSTRAINT scalar_width CHECK(payload::short_code IS NOT NULL),
    CONSTRAINT array_width CHECK(cardinality(labels::varchar[]::short_code[])=2),
    CONSTRAINT numeric_width CHECK(payload::short_amount IS NOT NULL));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'missing_context')!,
      entries = []
    for (const constraint of table.constraints) {
      for (const mode of ['captured', 'missing', 'source', 'incomplete', 'mismatched'] as const) {
        if ((mode === 'incomplete' || mode === 'mismatched') && constraint.name === 'numeric_width')
          continue
        const original = constraint.coercionContext!
        const context =
          mode === 'missing' || mode === 'source'
            ? undefined
            : mode === 'incomplete'
              ? { ...original, complete: false }
              : mode === 'mismatched'
                ? {
                    ...original,
                    casts: original.casts.map((c) => ({ ...c, name: 'wrong_domain' })),
                  }
                : original
        const expression = lowerTableCheck(
          table,
          { ...constraint, coercionContext: context },
          catalog.enums,
          catalog.domains,
          mode === 'source' ? 'source' : 'stored',
        )!.expression
        entries.push({
          name: constraint.name + '_' + mode,
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name + '_' + mode,
          },
          expected:
            (mode === 'missing' && constraint.name !== 'numeric_width') ||
            mode === 'incomplete' ||
            mode === 'mismatched'
              ? ({ kind: 'Unknown' } as Outcome)
              : ({ kind: 'True' } as Outcome),
        })
      }
    }
    const group = prepareCheckRustGroup(entries, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    const fixtures = entries.map((entry) => ({
      name: entry.name,
      row: {
        payload: {
          kind: 'Value' as const,
          value: entry.name.startsWith('numeric_') ? '12.34' : 'abcd',
        },
        labels: { kind: 'Value' as const, value: '{abcd,x}' },
      },
      expected: entry.expected,
    }))
    await runCheckParity(
      directory,
      'missingdomaincontext',
      group,
      entries.map((e) => e.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
