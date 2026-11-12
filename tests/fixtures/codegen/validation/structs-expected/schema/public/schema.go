package public

import (
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
)

type Documents struct {
	Payload   pgsid.JSON[jsonschemas.Document]                  `db:"payload"`
	Unchecked pgsid.JSON[jsonschemas.Document]                  `db:"unchecked"`
	Forced    pgsid.JSON[jsonschemas.Document]                  `db:"forced"`
	Maybe     pgsid.Null[pgsid.JSON[jsonschemas.MaybeDocument]] `db:"maybe"`
	Strict    pgsid.Null[pgsid.JSON[jsonschemas.Document]]      `db:"strict"`
}
