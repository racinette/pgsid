package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const UpsertSQL = "INSERT INTO items (id, payload) VALUES ($1, $2)\nON CONFLICT (id) DO UPDATE SET payload = $3;"

type UpsertParams struct {
	Id     int32             `db:"id"`
	First  jsonschemas.Event `db:"first"`
	Second jsonschemas.Event `db:"second"`
}

func (q *Queries) Upsert(ctx context.Context, params UpsertParams) error {
	jsonInput2, err := pgsidpgx.ValidateJSONInput(params.First, "pgsid:///jsonschemas/Event.json#", "Upsert", "first", false)
	if err != nil {
		return err
	}
	jsonInput3, err := pgsidpgx.ValidateJSONInput(params.Second, "pgsid:///jsonschemas/Event.json#", "Upsert", "second", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, UpsertSQL, params.Id, jsonInput2, jsonInput3)
	return err
}
