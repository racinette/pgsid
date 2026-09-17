package arrays

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const ReturnFlexibleSQL = "UPDATE arrays SET flexible = $1 WHERE id = $2 RETURNING flexible;"

type ReturnFlexibleParams struct {
	Flexible pgtype.Array[int32] `db:"flexible"`
	Id       *int32              `db:"id"`
}
type ReturnFlexibleRow struct {
	Flexible pgtype.Array[int32] `db:"flexible"`
}

func (q *Queries) ReturnFlexible(ctx context.Context, params ReturnFlexibleParams) (ReturnFlexibleRow, error) {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[int32](params.Flexible, []int{1, 2}, "ReturnFlexible", "flexible", false)
	if err != nil {
		return ReturnFlexibleRow{}, err
	}
	var row ReturnFlexibleRow
	err = q.db.QueryRow(ctx, ReturnFlexibleSQL, arrayInput1, params.Id).Scan(pgsidpgx.ArrayTarget[int32](&row.Flexible, []int{1, 2}, "ReturnFlexible", "flexible", false))
	return row, err
}
