import type { PGlite } from '@electric-sql/pglite'

// Snapshots may run inside a caller's transaction, where BEGIN and ROLLBACK would end it and
// discard the caller's uncommitted schema, so probes nest in a savepoint when one is open.
export async function withRolledBackProbe(
  pg: PGlite,
  probe: (tx: Pick<PGlite, 'exec' | 'query'>) => Promise<void>,
): Promise<void> {
  try {
    await pg.exec('SAVEPOINT pgsid_type_support_probe')
  } catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '25P01')
      throw error
    await pg.transaction(async (tx) => {
      await probe(tx)
      await tx.rollback()
    })
    return
  }
  try {
    await probe(pg)
  } finally {
    await pg.exec(
      'ROLLBACK TO SAVEPOINT pgsid_type_support_probe; RELEASE SAVEPOINT pgsid_type_support_probe',
    )
  }
}
