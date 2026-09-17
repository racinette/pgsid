package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const UpdatePayloadSQL = "UPDATE items SET payload = $1 WHERE id = $2;"

type UpdatePayloadParams struct {
	Payload jsonschemas.Event `db:"payload"`
	Id      pgsid.Null[int32] `db:"id"`
}

func (q *Queries) UpdatePayload(ctx context.Context, params UpdatePayloadParams) (int64, error) {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Event.json#", "UpdatePayload", "payload", false)
	if err != nil {
		return 0, err
	}
	tag, err := q.db.Exec(ctx, UpdatePayloadSQL, jsonInput1, pgsidpgx.Value(params.Id))
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
