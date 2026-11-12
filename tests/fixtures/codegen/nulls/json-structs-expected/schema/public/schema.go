package public

import (
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/pgsid"
)

type State string

const StateReady State = "ready"
const StateDone State = "done"

type UserId int64
type Profile struct {
	Id      *UserId          `db:"id"`
	Label   *string          `db:"label"`
	Payload *pgsid.JSON[any] `db:"payload"`
}
type Items struct {
	Id           int64                                 `db:"id"`
	UserId       *UserId                               `db:"user_id"`
	State        *State                                `db:"state"`
	Payload      *pgsid.JSON[jsonschemas.Document]     `db:"payload"`
	MaybePayload pgsid.JSON[jsonschemas.MaybeDocument] `db:"maybe_payload"`
	Numbers      []int64                               `db:"numbers"`
	Metadata     *Profile                              `db:"metadata"`
}
