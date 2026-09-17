package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const TupleUpdateSQL = "UPDATE items SET (payload, unchecked) = ($1, $2);"

type TupleUpdateParams struct {
	First  jsonschemas.Event  `db:"first"`
	Second *jsonschemas.Event `db:"second"`
}

func (q *Queries) TupleUpdate(ctx context.Context, params TupleUpdateParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.First, "pgsid:///jsonschemas/Event.json#", "TupleUpdate", "first", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, TupleUpdateSQL, jsonInput1, params.Second)
	return err
}
