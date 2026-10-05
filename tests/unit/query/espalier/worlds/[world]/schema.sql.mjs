export const description = 'the schema of one isolated database world'

export const rule = `Define the complete schema needed by this world. Keep it
independent of every other world and use domain names a reviewer can understand
without decoding a synthetic test vocabulary. A schema marked -- @world checks
belongs to CHECK evaluator testing; an unmarked schema belongs to query analysis.`

export async function lint({ read, emit }) {
  const text = await read()
  try {
    worldPurpose(text)
  } catch (error) {
    emit({ code: 'world_purpose_invalid', message: error.message, line: 1 })
  }
  if (!/\bCREATE\s+TABLE\b/i.test(text)) {
    emit({
      code: 'world_schema_without_table',
      message: 'an isolated world schema must define at least one table',
      line: 1,
    })
  }
}
import { tsImport } from 'tsx/esm/api'

const { worldPurpose } = await tsImport('../../../world-purpose.ts', import.meta.url)
