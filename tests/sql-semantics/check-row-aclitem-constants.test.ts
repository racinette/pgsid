import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves stored ACL facts through historical containers while deferring role-dependent values', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-aclitem-constants-')),
    artifact = 'artifacts/goal-checks/aclitem-stored-knowledge-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE ROLE acl_actor;CREATE ROLE acl_issuer;
      CREATE DOMAIN saved_acl AS aclitem CHECK(VALUE IS NOT NULL);
      CREATE TYPE saved_fields AS(entry saved_acl,history aclitem[],old integer);`)
    const quoted = async (sql: string) =>
      (await pg.query<{ value: string }>(`SELECT quote_literal((${sql})::text) value`)).rows[0]!
        .value
    const item = "'=r/acl_issuer'::aclitem",
      granted = "'acl_actor=r*/acl_issuer'::aclitem",
      record = await quoted(`ROW(${granted}::saved_acl,ARRAY[${item},NULL],1)::saved_fields`),
      array = await quoted(`ARRAY[${item},NULL,${granted}]`),
      definitions = [
        { name: 'item', type: 'aclitem', value: item },
        { name: 'options', type: 'aclitem', value: granted },
        { name: 'empty_rights', type: 'aclitem', value: "'=/acl_issuer'::aclitem" },
        { name: 'domain', type: 'saved_acl', value: `${item}::saved_acl` },
        { name: 'array', type: 'aclitem[]', value: `${array}::aclitem[]` },
        { name: 'record', type: 'saved_fields', value: `${record}::saved_fields` },
        {
          name: 'record_array',
          type: 'saved_fields[]',
          value: `ARRAY[${record}::saved_fields,NULL]`,
        },
        { name: 'text_present', type: 'bool', value: `(${item})::text IS NOT NULL` },
        {
          name: 'unequal_rights',
          type: 'bool',
          value: `${item}=makeaclitem(n::oid,n::oid,'UPDATE',false)`,
        },
        {
          name: 'uncovered_rights',
          type: 'bool',
          value: `aclcontains(ARRAY[${item}],makeaclitem(n::oid,n::oid,'UPDATE',false))`,
        },
        { name: 'array_size', type: 'int4', value: `cardinality(${array}::aclitem[])` },
        { name: 'record_presence', type: 'bool', value: `(${record}::saved_fields) IS NOT NULL` },
        {
          name: 'selected',
          type: 'aclitem',
          value: `CASE WHEN pick THEN ${item} ELSE NULL::aclitem END`,
        },
        {
          name: 'eager',
          type: 'int4',
          value: `CASE WHEN (${item}) IS NOT NULL THEN 1/0 ELSE 1 END`,
        },
        { name: 'lazy', type: 'int4', value: 'CASE WHEN pick THEN 1 ELSE n/d END' },
      ],
      forms = definitions.flatMap((f) => {
        const row = `ROW(n,${f.value})::r_${f.name}`,
          rendered = f.type === 'bytea' ? `encode(${f.value},'hex')` : `(${f.value})::text`
        return [
          ['direct', `(${f.value}) IS NOT NULL`],
          ['render', `${rendered} COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`],
          ['present', `${row} IS NOT NULL`],
          ['project', `(${row}).n>=1`],
          ['json', `to_jsonb(${row}) IS NOT DISTINCT FROM jsonb_build_object('n',n)`],
        ]
          .filter(([consumer]) => consumer !== 'render' || ['bool', 'int4'].includes(f.type))
          .map(([consumer, expression]) => ({
            ...f,
            name: f.name + '_' + consumer,
            family: f.name,
            expression,
          }))
      })
    for (const f of definitions) {
      const rendered = f.type === 'bytea' ? `encode(${f.value},'hex')` : `(${f.value})::text`
      await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,old ${f.type});
        CREATE FUNCTION pg_temp.observed_${f.name}(n int4,d int4,label text,pick bool) RETURNS text LANGUAGE SQL RETURN ${rendered}`)
    }
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,label text,pick bool,bypass bool,expected text,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    for (const f of definitions) await pg.exec(`ALTER TYPE r_${f.name} DROP ATTRIBUTE old`)
    await pg.exec(`ALTER DOMAIN saved_acl ADD CHECK(VALUE IS NULL) NOT VALID;
      ALTER TYPE saved_fields DROP ATTRIBUTE old;ALTER TYPE saved_fields RENAME ATTRIBUTE entry TO current_entry;`)
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const t = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, f.name).toBe(true)
        return (['source', 'stored'] as const).map((origin) => ({
          name: f.name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        extraFloatDigits: 1,
        clientEncoding: 'UTF8',
        nativeByteOrder: 'little',
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = [],
      bypassExpected = new Map<string, Outcome>()
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    for (const [index, item] of group.checks.entries())
      if (item.kind === 'supported')
        expect(
          item.inputs.filter((i) => i.name.startsWith('__pgsid_case_operand_')),
          plans[index]!.name,
        ).toEqual([])
    const input = (value: number | string | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const f of forms)
      for (const [n, d, label, pick] of [
        [1, 1, '<r/>', true],
        [1, 0, '<r/>', false],
        [2, 0, '<?xml version="1.0"?><r/>', true],
        [3, 2, '<r><a/></r>', true],
        [null, 0, null, false],
        [null, null, '', null],
        [-1, 1, 'é😊', false],
        [1, 2, '2', null],
        [32768, 1, 'é😊', true],
      ] as const)
        for (const bypass of [false, true]) {
          let rendered: string | null = null
          try {
            rendered = (
              await pg.query<{ value: string | null }>(
                `SELECT pg_temp.observed_${f.family}($1,$2,$3,$4) value`,
                [n, d, label, pick],
              )
            ).rows[0]!.value
          } catch {
            rendered = null
          }
          const params = [n, d, label, pick, bypass, rendered]
          let error: string | undefined,
            rejected = false,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5,$6)`, params)
          } catch (e) {
            error = (e as { code: string }).code
            rejected = error === '23514' && (e as { constraint?: string }).constraint === 'valid'
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5,$6)`, params)
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          const expected: Outcome = error
              ? rejected
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: isNull ? 'Null' : 'True' },
            row: Row = {
              n: input(n),
              d: input(d),
              label: input(label),
              pick: input(pick),
              bypass: input(bypass),
              expected: input(rendered),
            }
          if (bypass && !bypassExpected.has(f.name)) bypassExpected.set(f.name, expected)
          native.push({ name: f.name, row, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: f.name + '_' + origin, row, expected })
        }
    for (const f of forms)
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: f.name + '_' + origin,
          row: {
            n: { kind: 'Unknown' },
            d: { kind: 'Unknown' },
            label: { kind: 'Unknown' },
            pick: { kind: 'Unknown' },
            bypass: input(true),
            expected: { kind: 'Unknown' },
          },
          expected: bypassExpected.get(f.name)!,
        })
      }
    for (const origin of ['source', 'stored'])
      fixtures.push({
        name: 'item_project_' + origin,
        row: {
          n: input(1),
          d: { kind: 'Unknown' },
          label: { kind: 'Unknown' },
          pick: { kind: 'Unknown' },
          bypass: input(false),
          expected: { kind: 'Unknown' },
        },
        expected: { kind: 'True' },
      })
    await mkdir(artifact, { recursive: true })
    for (const [file, value] of Object.entries({
      plans,
      contexts: c.tables
        .filter((t) => t.name.startsWith('evolving_'))
        .map((t) => ({ name: t.name, constraint: t.constraints[0] })),
      'native-reference': native,
      fixtures,
    }))
      await writeFile(join(artifact, file + '.json'), JSON.stringify(value, null, 2) + '\n')
    await writeFile(join(artifact, 'evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'example.com/row-aclitem-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)

it('keeps unresolved ACL roles distinct from NULL, errors and known privilege mismatches', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-aclitem-context-')),
    artifact = 'artifacts/goal-checks/aclitem-stored-knowledge-active'
  try {
    await pg.exec('CREATE ROLE acl_context_issuer')
    const literal = "'acl_context_issuer=r/acl_context_issuer'::aclitem",
      definitions: Record<string, string> = {
        present: `${literal} IS NOT NULL`,
        same: `${literal}=makeaclitem(role_id,role_id,'SELECT',false)`,
        wrong_rights: `${literal}=makeaclitem(role_id,role_id,'UPDATE',false)`,
        contains: `aclcontains(ARRAY[${literal}],makeaclitem(role_id,role_id,'SELECT',false))`,
        uncovered: `aclcontains(ARRAY[${literal}],makeaclitem(role_id,role_id,'UPDATE',false))`,
        missing_options: `aclcontains(ARRAY[${literal}],makeaclitem(role_id,role_id,'SELECT',true))`,
        empty_acl: `aclcontains(acldefault('c',role_id),${literal})`,
        invalid_bitmap: `aclcontains(ARRAY[${literal},NULL],${literal})`,
        invalid_shape: `aclcontains(ARRAY[ARRAY[${literal}]],${literal})`,

        hash: `hash_aclitem(${literal})=recorded_hash`,
        strict_null: `${literal}=NULL::aclitem`,
        strict_seed: `hash_aclitem_extended(${literal},NULL::bigint) IS NULL`,
        text_present: `(${literal})::text IS NOT NULL`,
        obsolete: `aclinsert(ARRAY[${literal}],${literal}) IS NULL`,
        lazy: `CASE WHEN bypass THEN true ELSE hash_aclitem(${literal})=recorded_hash END`,
        coalesced: `COALESCE(${literal},makeaclitem((1/zero)::oid,role_id,'SELECT',false)) IS NOT NULL`,
        eager: `hash_aclitem(CASE WHEN bypass THEN ${literal} ELSE 'acl_context_issuer=w/acl_context_issuer'::aclitem END)+(1/zero)>0`,
        preparation: `hash_aclitem(${literal})+(1/zero)>0`,
        json_output: `to_jsonb(${literal}) IS NULL`,
      }
    await pg.exec(
      `CREATE TABLE acl_context(role_id oid,recorded_hash integer,zero integer,bypass boolean,${Object.entries(
        definitions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'acl_context')!,
      plans = Object.entries(definitions).flatMap(([name, sql]) =>
        (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: t.name,
            constraint: name + '_' + origin,
          },
          expression: lowerTableCheck(
            t,
            t.constraints.find((k) => k.name === name)!,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source' ? `CHECK(${sql})` : undefined,
          )!.expression,
        })),
      ),
      group = prepareCheckRustGroup(plans),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    for (const [i, k] of group.checks.entries())
      expect(k.kind, plans[i]!.name + ('reason' in k ? ': ' + k.reason : '')).toBe('supported')
    const issuer = (
        await pg.query<{ id: number }>(
          "SELECT oid id FROM pg_roles WHERE rolname='acl_context_issuer'",
        )
      ).rows[0]!.id,
      hash = (await pg.query<{ value: number }>(`SELECT hash_aclitem(${literal}) value`)).rows[0]!
        .value,
      known = (value: bigint | number | boolean | null): Row[string] =>
        value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const roleId of [0, issuer, issuer + 1])
      for (const bypass of [false, true]) {
        const row: Row = {
          role_id: known(BigInt(roleId)),
          recorded_hash: known(hash),
          zero: known(0),
          bypass: known(bypass),
        }
        for (const [name, sql] of Object.entries(definitions)) {
          let actual: Outcome
          try {
            const answer = (
              await pg.query<{ value: boolean | null }>(
                `SELECT (${sql}) value FROM (SELECT $1::oid role_id,$2::int recorded_hash,0 zero,$3::bool bypass) q`,
                [roleId, hash, bypass],
              )
            ).rows[0]!.value
            actual = { kind: answer === null ? 'Null' : answer ? 'True' : 'False' }
          } catch (error) {
            actual = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          const deferred =
              ['hash', 'json_output'].includes(name) ||
              (['same', 'contains'].includes(name) && roleId !== 0) ||
              (name === 'lazy' && !bypass),
            expected: Outcome = deferred ? { kind: 'Unknown' } : actual
          native.push({
            name,
            roleId: roleId === issuer ? 'issuer' : roleId === 0 ? 'invalid' : 'other',
            bypass,
            actual,
            deferred,
          })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
      }
    expect(
      native.filter((v) => {
        const r = v as { name: string; actual: Outcome }
        return r.name === 'same' && r.actual.kind === 'True'
      }),
    ).not.toHaveLength(0)
    expect(
      native.filter((v) => {
        const r = v as { name: string; actual: Outcome }
        return r.name === 'same' && r.actual.kind === 'False'
      }),
    ).not.toHaveLength(0)
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'context-reference.json'),
      JSON.stringify(native, null, 2) + '\n',
    )
    await writeFile(
      join(artifact, 'context-fixtures.json'),
      JSON.stringify(
        fixtures,
        (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      ) + '\n',
    )
    await writeFile(join(artifact, 'context-plans.json'), JSON.stringify(plans, null, 2) + '\n')
    await writeFile(join(artifact, 'context-evaluators.rs'), group.evaluatorSource!)
    expect(group.evaluatorSource).not.toContain(`make_aclitem_value(${issuer}i64`)
    await runCheckParity(
      root,
      'example.com/aclitem-context',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
