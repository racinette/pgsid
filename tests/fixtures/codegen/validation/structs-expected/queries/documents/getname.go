package documents

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetNameSQL = "SELECT payload ->> 'name' AS name FROM documents;"

type GetNameParams struct {
}
type GetNameRow struct {
	Name pgsid.Null[string] `db:"name"`
}

func (q *Queries) GetName(ctx context.Context) (GetNameRow, error) {
	var row GetNameRow
	err := q.db.QueryRow(ctx, GetNameSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.Nullable(&row.Name)))
	return row, err
}
