package events

import "context"

const HiddenSQL = "SELECT 3 AS value;"

type HiddenParams struct {
}
type HiddenRow struct {
	Value int32 `db:"value"`
}

func (q *Queries) Hidden(ctx context.Context) (HiddenRow, error) {
	var row HiddenRow
	err := q.db.QueryRow(ctx, HiddenSQL).Scan(&row.Value)
	return row, err
}
