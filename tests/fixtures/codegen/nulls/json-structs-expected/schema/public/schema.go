package public

import (
	"encoding/json"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
)

type State string

const StateReady State = "ready"
const StateDone State = "done"

type UserId int64
type Profile struct {
	Id      *UserId          `db:"id"`
	Label   *string          `db:"label"`
	Payload *json.RawMessage `db:"payload"`
}
type Items struct {
	Id           int64                     `db:"id"`
	UserId       *UserId                   `db:"user_id"`
	State        *State                    `db:"state"`
	Payload      *jsonschemas.Document     `db:"payload"`
	MaybePayload jsonschemas.MaybeDocument `db:"maybe_payload"`
	Numbers      []int64                   `db:"numbers"`
	Metadata     *Profile                  `db:"metadata"`
}
