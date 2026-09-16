package public

import (
	jsonschemas "example.com/pgsid-fixture/generated/go/jsonschemas"
	"time"
)

type EventState string

const EventStateReady EventState = "ready"
const EventStateInProgress EventState = "in-progress"
const EventStateDone EventState = "done"

type EventId int64
type DefaultEventId EventId
type EventMetadata struct {
	Source     *string `db:"source"`
	Confidence *string `db:"confidence"`
}
type Accounts struct {
	Id          int64  `db:"id"`
	DisplayName string `db:"display_name"`
}
type Events struct {
	Id        EventId                  `db:"id"`
	DefaultId DefaultEventId           `db:"default_id"`
	AccountId *int64                   `db:"account_id"`
	State     EventState               `db:"state"`
	States    []EventState             `db:"states"`
	Payload   jsonschemas.EventPayload `db:"payload"`
	Audit     *jsonschemas.EventAudit  `db:"audit"`
	Metadata  *EventMetadata           `db:"metadata"`
	Note      *string                  `db:"note"`
	CreatedAt time.Time                `db:"created_at"`
}
type EventDetails struct {
	Id          EventId                        `db:"id"`
	Actor       *jsonschemas.EventPayloadActor `db:"actor"`
	AccountId   *int64                         `db:"account_id"`
	DisplayName *string                        `db:"display_name"`
}
type EventTotals struct {
	State EventState `db:"state"`
	Total int64      `db:"total"`
}
