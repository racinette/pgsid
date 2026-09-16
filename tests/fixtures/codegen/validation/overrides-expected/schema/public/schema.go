package public

import jsonschemas "example.com/pgsid-validation/generated/jsonschemas"

type Documents struct {
	Payload   jsonschemas.Document       `db:"payload"`
	Unchecked jsonschemas.Document       `db:"unchecked"`
	Forced    jsonschemas.Document       `db:"forced"`
	Maybe     *jsonschemas.MaybeDocument `db:"maybe"`
	Strict    *jsonschemas.Document      `db:"strict"`
}
