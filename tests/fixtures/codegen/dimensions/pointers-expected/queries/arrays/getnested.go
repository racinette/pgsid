package arrays

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const GetNestedSQL = "WITH first AS (SELECT matrix, flexible FROM arrays),\nsecond AS (SELECT matrix AS renamed, flexible FROM first)\nSELECT renamed, flexible FROM second;"

type GetNestedParams struct {
}
type GetNestedRow struct {
	Renamed  [][]int32           `db:"renamed"`
	Flexible pgtype.Array[int32] `db:"flexible"`
}

func (q *Queries) GetNested(ctx context.Context) (GetNestedRow, error) {
	var row GetNestedRow
	err := q.db.QueryRow(ctx, GetNestedSQL).Scan(pgsidpgx.ArrayTarget[int32](&row.Renamed, []int{2}, "GetNested", "renamed", false), pgsidpgx.ArrayTarget[int32](&row.Flexible, []int{1, 2}, "GetNested", "flexible", false))
	return row, err
}
