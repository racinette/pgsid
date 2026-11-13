package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetNestedSQL = "WITH first AS (SELECT matrix, flexible FROM arrays),\nsecond AS (SELECT matrix AS renamed, flexible FROM first)\nSELECT renamed, flexible FROM second;"

type GetNestedParams struct {
}
type GetNestedRow struct {
	Renamed  [][]pgsid.Null[int32]              `db:"renamed"`
	Flexible pgsid.Array1Or2[pgsid.Null[int32]] `db:"flexible"`
}

func (q *Queries) GetNested(ctx context.Context) (GetNestedRow, error) {
	var row GetNestedRow
	err := q.db.QueryRow(ctx, GetNestedSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Renamed, nil, []int{2}, "sql.codegen.go.mappings.column[\"public.arrays.matrix\"].dimensions", "GetNested", "renamed", false), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Flexible, []any{pgsid.D1[pgsid.Null[int32]](nil), pgsid.D2[pgsid.Null[int32]](nil)}, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.flexible\"].dimensions", "GetNested", "flexible", false)))
	return row, err
}
