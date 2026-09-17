package public

import (
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
)

type Items struct {
	Id        int32                           `db:"id"`
	Payload   jsonschemas.Event               `db:"payload"`
	Unchecked pgsid.Null[jsonschemas.Event]   `db:"unchecked"`
	Maybe     pgsid.Null[jsonschemas.Maybe]   `db:"maybe"`
	Literal   jsonschemas.Maybe               `db:"literal"`
	Numbers   pgsid.Null[jsonschemas.Numbers] `db:"numbers"`
	Audit     pgsid.Null[jsonschemas.Audit]   `db:"audit"`
}
