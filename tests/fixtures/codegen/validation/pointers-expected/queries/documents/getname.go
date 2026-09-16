package documents

import "context"

const GetNameSQL = "SELECT payload ->> 'name' AS name FROM documents;"

type GetNameParams struct {
}
type GetNameRow struct {
	Name *string `db:"name"`
}

func (q *Queries) GetName(ctx context.Context) (GetNameRow, error) {
	var row GetNameRow
	err := q.db.QueryRow(ctx, GetNameSQL).Scan(&row.Name)
	return row, err
}
