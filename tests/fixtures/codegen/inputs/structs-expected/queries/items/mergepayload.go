package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const MergePayloadSQL = "MERGE INTO items USING (SELECT $1::integer AS id, $2::jsonb AS payload) AS source\nON items.id = source.id\nWHEN MATCHED THEN UPDATE SET payload = source.payload\nWHEN NOT MATCHED THEN INSERT (id, payload) VALUES (source.id, source.payload);"

type MergePayloadParams struct {
	Id      int32             `db:"id"`
	Payload jsonschemas.Event `db:"payload"`
}

func (q *Queries) MergePayload(ctx context.Context, params MergePayloadParams) error {
	jsonInput2, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Event.json#", "MergePayload", "payload", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, MergePayloadSQL, params.Id, jsonInput2)
	return err
}
