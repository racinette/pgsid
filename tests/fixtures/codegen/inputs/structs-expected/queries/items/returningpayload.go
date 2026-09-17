package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const ReturningPayloadSQL = "UPDATE items SET payload = $1 RETURNING payload;"

type ReturningPayloadParams struct {
	Payload jsonschemas.Event `db:"payload"`
}
type ReturningPayloadRow struct {
	Payload jsonschemas.Event `db:"payload"`
}

func (q *Queries) ReturningPayload(ctx context.Context, params ReturningPayloadParams) (ReturningPayloadRow, error) {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Event.json#", "ReturningPayload", "payload", false)
	if err != nil {
		return ReturningPayloadRow{}, err
	}
	var row ReturningPayloadRow
	err = q.db.QueryRow(ctx, ReturningPayloadSQL, jsonInput1).Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Payload, "pgsid:///jsonschemas/Event.json#", "ReturningPayload", "payload", false)))
	return row, err
}
