import { anonymousRecordProfile } from '../../sql-semantics/anonymous-records.js'
import { compositeProfile, compositeFieldType } from '../../sql-semantics/composite-profiles.js'
import { recordFieldHashSupport, recordPhysicalHashSupport } from './check-hash-context.js'
export { recordFieldHashSupport } from './check-hash-context.js'

export interface RecordHashField {
  type: string | null
  signature: string | null
  availability: number
  collation: 'C' | 'deterministic' | 'other' | 'default'
}
export interface RecordHashLayout {
  identity: string
  fields: RecordHashField[]
}

export function recordHashLayouts(type: string, extended: boolean): RecordHashLayout[] | null {
  const anonymous = anonymousRecordProfile(type)
  if (anonymous)
    return anonymous.map((layout) => ({
      identity: layout.identity,
      fields: layout.fields.map((field) => {
        const support = recordFieldHashSupport(field.type, extended)
        return {
          type: field.type,
          signature: field.unknown ? null : support.signature,
          availability: field.unknown ? 0 : support.availability,
          collation: field.collation ?? 'default',
        }
      }),
    }))
  const profile = compositeProfile(type),
    definition = profile?.graph.definitions.find((n) => n.identity === profile.identity)
  if (!profile || !definition) return null
  return [
    {
      identity: profile.identity,
      fields: definition.fields.map((field) => {
        const support = recordPhysicalHashSupport(profile, field.type, extended)
        return {
          type: compositeFieldType(profile, field.type),
          signature: support.signature,
          availability: support.availability,
          collation: field.collationIsC
            ? 'C'
            : field.collationIsDefault
              ? 'default'
              : field.collationDeterministic
                ? 'deterministic'
                : 'other',
        }
      }),
    },
  ]
}
