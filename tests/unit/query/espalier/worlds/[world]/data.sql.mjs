export const description = 'the witness rows for one isolated database world'

export const rule = `Seed rows chosen to exercise the world's claims. Include
both sides of every output presence union whenever the schema can produce them;
volume is not a substitute for a discriminating row.`

export async function lint({ read, emit }) {
  const text = await read()
  if (!/\bINSERT\s+INTO\b/i.test(text)) {
    emit({
      code: 'world_data_without_rows',
      message: 'world data must seed at least one row',
      line: 1,
    })
  }
}
