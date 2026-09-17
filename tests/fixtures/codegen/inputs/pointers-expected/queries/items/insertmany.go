package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const InsertManySQL = "INSERT INTO items (payload) VALUES ($1), ($2);"

type InsertManyParams struct {
	First  jsonschemas.Event `db:"first"`
	Second jsonschemas.Event `db:"second"`
}

func (q *Queries) InsertMany(ctx context.Context, params InsertManyParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.First, "pgsid:///jsonschemas/Event.json#", "InsertMany", "first", false)
	if err != nil {
		return err
	}
	jsonInput2, err := pgsidpgx.ValidateJSONInput(params.Second, "pgsid:///jsonschemas/Event.json#", "InsertMany", "second", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertManySQL, jsonInput1, jsonInput2)
	return err
}
