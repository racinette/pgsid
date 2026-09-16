import type { EventId, DefaultEventId } from './generated/typescript/types/schema/public/domains.js'
import type { EventId as BillingEventId } from './generated/typescript/types/schema/billing/domains.js'
import type { EventState } from './generated/typescript/types/schema/public/enums.js'
import type { EventState as BillingEventState } from './generated/typescript/types/schema/billing/enums.js'
import type {
  EventPayload,
  EventPayloadActor,
} from './generated/typescript/types/jsonschemas/EventPayload.js'
import type { GetEventRow } from './generated/typescript/types/queries/events/GetEvent.js'
import type { GetEventTypesRow } from './generated/typescript/types/queries/events/GetEventTypes.js'
import type { GetBillingEventRow } from './generated/typescript/types/queries/events/GetBillingEvent.js'
import type { Events as BillingEvents } from './generated/typescript/types/schema/billing/tables.js'

declare function expectType<T>(value: T): void

declare const event: GetEventRow
expectType<EventId>(event.id)
expectType<EventState>(event.state)
expectType<EventPayload>(event.payload)
expectType<EventPayloadActor | null>(event.actor)

declare const types: GetEventTypesRow
expectType<DefaultEventId | null>(types.default_id)
expectType<(EventState | null)[] | null>(types.states)
expectType<(number | null)[]>(types.numbers)
const nullableMembers: GetEventTypesRow['numbers'] = [1, null]
void nullableMembers
// @ts-expect-error Array member types remain constrained.
const wrongMembers: GetEventTypesRow['numbers'] = ['bad']
void wrongMembers

type IsNever = [DefaultEventId] extends [never] ? true : false
const inhabitable: IsNever = false
void inhabitable
// @ts-expect-error Different domains have distinct brands.
const wrongBrand: EventId = types.default_id
void wrongBrand
// @ts-expect-error Unbranded scalars cannot be assigned to domain values.
const unbranded: EventId = 1n
void unbranded

declare const billing: GetBillingEventRow
expectType<BillingEventId>(billing.id)
expectType<EventId>(billing.source_id)
expectType<BillingEventState>(billing.state)
declare const billingTable: BillingEvents['select']
expectType<BillingEventId>(billingTable.id)
expectType<EventId>(billingTable.source_id)
// @ts-expect-error Identically named domains in different schemas remain distinct.
const wrongSchema: EventId = billing.id
void wrongSchema

const recursive: EventPayload = {
  actor: { id: 1 },
  flags: [],
  next: { actor: { id: 2 }, flags: [], next: { actor: { id: 3 }, flags: [] } },
}
void recursive
const invalidRecursiveValue = {
  actor: { id: 1 },
  flags: [],
  next: { actor: { id: 2 }, flags: [], next: { actor: { id: 'bad' }, flags: [] } },
}
// @ts-expect-error Recursive JSON schemas preserve deep property constraints.
const invalidRecursive: EventPayload = invalidRecursiveValue
void invalidRecursive
