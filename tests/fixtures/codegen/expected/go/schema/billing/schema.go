package billing

import public "example.com/pgsid-fixture/generated/go/schema/public"

type EventState string

const EventStatePending EventState = "pending"
const EventStatePaid EventState = "paid"

type EventId int64
type EventMetadata struct {
	Event *public.EventId `db:"event"`
}
type Events struct {
	Id       EventId        `db:"id"`
	SourceId public.EventId `db:"source_id"`
	State    EventState     `db:"state"`
	Metadata *EventMetadata `db:"metadata"`
}
