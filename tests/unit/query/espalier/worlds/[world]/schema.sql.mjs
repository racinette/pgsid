export const description = 'the schema of one isolated database world'

export const rule = `Define the complete schema needed by this world. Keep it
independent of every other world and use domain names a reviewer can understand
without decoding a synthetic test vocabulary.`

export async function lint({ read, emit }) {
  const text = await read()
  if (!/\bCREATE\s+TABLE\b/i.test(text)) {
    emit({
      code: 'world_schema_without_table',
      message: 'an isolated world schema must define at least one table',
      line: 1,
    })
  }
}
