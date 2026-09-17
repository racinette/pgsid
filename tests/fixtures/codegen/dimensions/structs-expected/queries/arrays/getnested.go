package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const GetNestedSQL = "WITH first AS (SELECT matrix, flexible FROM arrays),\nsecond AS (SELECT matrix AS renamed, flexible FROM first)\nSELECT renamed, flexible FROM second;"

type GetNestedParams struct {
}
type GetNestedRow struct {
	Renamed  [][]pgsid.Null[int32]           `db:"renamed"`
	Flexible pgtype.Array[pgsid.Null[int32]] `db:"flexible"`
}

func (q *Queries) GetNested(ctx context.Context) (GetNestedRow, error) {
	var row GetNestedRow
	err := q.db.QueryRow(ctx, GetNestedSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Renamed, []int{2}, "GetNested", "renamed", false), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Flexible, []int{1, 2}, "GetNested", "flexible", false)))
	return row, err
}
