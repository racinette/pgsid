package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const CastJSONSQL = "INSERT INTO items (payload) VALUES ($1::json::jsonb);"

type CastJSONParams struct {
	Payload jsonschemas.Event `db:"payload"`
}

func (q *Queries) CastJSON(ctx context.Context, params CastJSONParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Event.json#", "CastJSON", "payload", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, CastJSONSQL, jsonInput1)
	return err
}
