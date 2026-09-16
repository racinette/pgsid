package public

import (
	"encoding/json"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/pgsid"
)

type State string

const StateReady State = "ready"
const StateDone State = "done"

type UserId int64
type Profile struct {
	Id      pgsid.Null[UserId]          `db:"id"`
	Label   pgsid.Null[string]          `db:"label"`
	Payload pgsid.Null[json.RawMessage] `db:"payload"`
}
type Items struct {
	Id           int64                            `db:"id"`
	UserId       pgsid.Null[UserId]               `db:"user_id"`
	State        pgsid.Null[State]                `db:"state"`
	Payload      pgsid.Null[jsonschemas.Document] `db:"payload"`
	MaybePayload jsonschemas.MaybeDocument        `db:"maybe_payload"`
	Numbers      pgsid.Null[[]pgsid.Null[int64]]  `db:"numbers"`
	Metadata     pgsid.Null[Profile]              `db:"metadata"`
}
