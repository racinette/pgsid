package public

import (
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
)

type Documents struct {
	Payload   jsonschemas.Document                  `db:"payload"`
	Unchecked jsonschemas.Document                  `db:"unchecked"`
	Forced    jsonschemas.Document                  `db:"forced"`
	Maybe     pgsid.Null[jsonschemas.MaybeDocument] `db:"maybe"`
	Strict    pgsid.Null[jsonschemas.Document]      `db:"strict"`
}
