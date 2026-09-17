package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const GetAccessSQL = "SELECT matrix[1][2] AS element, matrix[1] AS incomplete,\nmatrix[1:2][1:2] AS sliced, flexible[1:2] AS flexible_slice FROM arrays;"

type GetAccessParams struct {
}
type GetAccessRow struct {
	Element       pgsid.Null[int32]               `db:"element"`
	Incomplete    pgsid.Null[int32]               `db:"incomplete"`
	Sliced        [][]pgsid.Null[int32]           `db:"sliced"`
	FlexibleSlice pgtype.Array[pgsid.Null[int32]] `db:"flexible_slice"`
}

func (q *Queries) GetAccess(ctx context.Context) (GetAccessRow, error) {
	var row GetAccessRow
	err := q.db.QueryRow(ctx, GetAccessSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.Nullable(&row.Element), pgsidpgx.Nullable(&row.Incomplete), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Sliced, []int{2}, "GetAccess", "sliced", false), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.FlexibleSlice, []int{1, 2}, "GetAccess", "flexible_slice", false)))
	return row, err
}
