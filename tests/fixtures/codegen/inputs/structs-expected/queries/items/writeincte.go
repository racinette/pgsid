package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const WriteInCteSQL = "WITH written AS (INSERT INTO items (payload) VALUES ($1) RETURNING payload)\nSELECT payload FROM written;"

type WriteInCteParams struct {
	Payload pgsid.JSON[jsonschemas.Event] `db:"payload"`
}
type WriteInCteRow struct {
	Payload pgsid.JSON[jsonschemas.Event] `db:"payload"`
}

func (q *Queries) WriteInCte(ctx context.Context, params WriteInCteParams) (WriteInCteRow, error) {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Event.json#", "WriteInCte", "payload", false)
	if err != nil {
		return WriteInCteRow{}, err
	}
	var row WriteInCteRow
	err = q.db.QueryRow(ctx, WriteInCteSQL, jsonInput1).Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Payload, "pgsid:///jsonschemas/Event.json#", "WriteInCte", "payload", false)))
	return row, err
}
