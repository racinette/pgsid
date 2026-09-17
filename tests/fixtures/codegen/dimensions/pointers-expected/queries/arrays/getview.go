package arrays

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const GetViewSQL = "SELECT matrix, flexible FROM array_view;"

type GetViewParams struct {
}
type GetViewRow struct {
	Matrix   [][]int32           `db:"matrix"`
	Flexible pgtype.Array[int32] `db:"flexible"`
}

func (q *Queries) GetView(ctx context.Context) (GetViewRow, error) {
	var row GetViewRow
	err := q.db.QueryRow(ctx, GetViewSQL).Scan(pgsidpgx.ArrayTarget[int32](&row.Matrix, []int{2}, "GetView", "matrix", false), pgsidpgx.ArrayTarget[int32](&row.Flexible, []int{1, 2}, "GetView", "flexible", false))
	return row, err
}
