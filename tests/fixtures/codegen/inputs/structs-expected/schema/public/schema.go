package public

import (
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
)

type Items struct {
	Id        int32                                       `db:"id"`
	Payload   pgsid.JSON[jsonschemas.Event]               `db:"payload"`
	Unchecked pgsid.Null[pgsid.JSON[jsonschemas.Event]]   `db:"unchecked"`
	Maybe     pgsid.Null[pgsid.JSON[jsonschemas.Maybe]]   `db:"maybe"`
	Literal   pgsid.JSON[jsonschemas.Maybe]               `db:"literal"`
	Numbers   pgsid.Null[pgsid.JSON[jsonschemas.Numbers]] `db:"numbers"`
	Audit     pgsid.Null[pgsid.JSON[jsonschemas.Audit]]   `db:"audit"`
}
