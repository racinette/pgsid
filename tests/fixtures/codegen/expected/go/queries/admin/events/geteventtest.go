package events

import "context"

const GetEventTestSQL = "SELECT 2 AS value;"

type GetEventTestParams struct {
}
type GetEventTestRow struct {
	Value int32 `db:"value"`
}

func (q *Queries) GetEventTest(ctx context.Context) (GetEventTestRow, error) {
	var row GetEventTestRow
	err := q.db.QueryRow(ctx, GetEventTestSQL).Scan(&row.Value)
	return row, err
}
