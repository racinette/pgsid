package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const InsertPayloadSQL = "INSERT INTO items (payload) VALUES ($1);"

type InsertPayloadParams struct {
	Payload jsonschemas.Event `db:"payload"`
}

func (q *Queries) InsertPayload(ctx context.Context, params InsertPayloadParams) error {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Event.json#", "InsertPayload", "payload", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertPayloadSQL, jsonInput1)
	return err
}
