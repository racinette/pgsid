export function worldPurpose(schema: string): 'queries' | 'checks' {
  const declarations = [...schema.matchAll(/^--\s*@world\b([^\r\n]*)$/gmu)]
  if (declarations.length === 0) return 'queries'
  const purpose = declarations[0]![1]!.trim()
  if (declarations.length !== 1 || (purpose !== 'queries' && purpose !== 'checks'))
    throw new Error('Declare exactly one -- @world queries or -- @world checks')
  return purpose
}
