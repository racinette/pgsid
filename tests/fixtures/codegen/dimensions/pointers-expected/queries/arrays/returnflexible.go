package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const ReturnFlexibleSQL = "UPDATE arrays SET flexible = $1 WHERE id = $2 RETURNING flexible;"

type ReturnFlexibleParams struct {
	Flexible pgsid.Array1Or2[int32] `db:"flexible"`
	Id       *int32                 `db:"id"`
}
type ReturnFlexibleRow struct {
	Flexible pgsid.Array1Or2[int32] `db:"flexible"`
}

func (q *Queries) ReturnFlexible(ctx context.Context, params ReturnFlexibleParams) (ReturnFlexibleRow, error) {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[int32](params.Flexible, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.flexible\"].dimensions", "ReturnFlexible", "flexible", false)
	if err != nil {
		return ReturnFlexibleRow{}, err
	}
	var row ReturnFlexibleRow
	err = q.db.QueryRow(ctx, ReturnFlexibleSQL, arrayInput1, params.Id).Scan(pgsidpgx.ArrayTarget[int32](&row.Flexible, []any{pgsid.D1[int32](nil), pgsid.D2[int32](nil)}, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.flexible\"].dimensions", "ReturnFlexible", "flexible", false))
	return row, err
}
