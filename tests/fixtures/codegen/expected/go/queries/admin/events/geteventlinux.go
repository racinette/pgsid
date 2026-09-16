package events

import "context"

const GetEventLinuxSQL = "SELECT 1 AS value;"

type GetEventLinuxParams struct {
}
type GetEventLinuxRow struct {
	Value int32 `db:"value"`
}

func (q *Queries) GetEventLinux(ctx context.Context) (GetEventLinuxRow, error) {
	var row GetEventLinuxRow
	err := q.db.QueryRow(ctx, GetEventLinuxSQL).Scan(&row.Value)
	return row, err
}
