package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetViewSQL = "SELECT matrix, flexible FROM array_view;"

type GetViewParams struct {
}
type GetViewRow struct {
	Matrix   [][]pgsid.Null[int32]              `db:"matrix"`
	Flexible pgsid.Array1Or2[pgsid.Null[int32]] `db:"flexible"`
}

func (q *Queries) GetView(ctx context.Context) (GetViewRow, error) {
	var row GetViewRow
	err := q.db.QueryRow(ctx, GetViewSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Matrix, nil, []int{2}, "sql.codegen.go.mappings.column[\"public.arrays.matrix\"].dimensions", "GetView", "matrix", false), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Flexible, []any{pgsid.D1[pgsid.Null[int32]](nil), pgsid.D2[pgsid.Null[int32]](nil)}, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.flexible\"].dimensions", "GetView", "flexible", false)))
	return row, err
}
