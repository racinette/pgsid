package items

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const ReturningManySQL = "UPDATE items SET payload = $1 RETURNING payload;"

type ReturningManyParams struct {
	Payload jsonschemas.Event `db:"payload"`
}
type ReturningManyRow struct {
	Payload jsonschemas.Event `db:"payload"`
}

func (q *Queries) ReturningMany(ctx context.Context, params ReturningManyParams) ([]ReturningManyRow, error) {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Event.json#", "ReturningMany", "payload", false)
	if err != nil {
		return nil, err
	}
	rows, err := q.db.Query(ctx, ReturningManySQL, jsonInput1)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]ReturningManyRow, 0)
	for rows.Next() {
		var row ReturningManyRow
		if err := rows.Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Payload, "pgsid:///jsonschemas/Event.json#", "ReturningMany", "payload", false))); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
