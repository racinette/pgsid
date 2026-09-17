package public

import jsonschemas "example.com/pgsid-validation/generated/jsonschemas"

type Items struct {
	Id        int32                `db:"id"`
	Payload   jsonschemas.Event    `db:"payload"`
	Unchecked *jsonschemas.Event   `db:"unchecked"`
	Maybe     *jsonschemas.Maybe   `db:"maybe"`
	Literal   jsonschemas.Maybe    `db:"literal"`
	Numbers   *jsonschemas.Numbers `db:"numbers"`
	Audit     *jsonschemas.Audit   `db:"audit"`
}
