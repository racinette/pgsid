package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const InsertFromCteSQL = "WITH a AS (SELECT $1::jsonb AS payload), b AS (SELECT payload FROM a)\nINSERT INTO items (payload) SELECT payload FROM b;"

type InsertFromCteParams struct {
	Payload *jsonschemas.Event `db:"payload"`
}

func (q *Queries) InsertFromCte(ctx context.Context, params InsertFromCteParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Event.json#", "InsertFromCte", "payload", true)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertFromCteSQL, jsonInput1)
	return err
}
