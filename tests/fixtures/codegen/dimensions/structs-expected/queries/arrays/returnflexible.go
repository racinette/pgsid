package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const ReturnFlexibleSQL = "UPDATE arrays SET flexible = $1 WHERE id = $2 RETURNING flexible;"

type ReturnFlexibleParams struct {
	Flexible pgtype.Array[pgsid.Null[int32]] `db:"flexible"`
	Id       pgsid.Null[int32]               `db:"id"`
}
type ReturnFlexibleRow struct {
	Flexible pgtype.Array[pgsid.Null[int32]] `db:"flexible"`
}

func (q *Queries) ReturnFlexible(ctx context.Context, params ReturnFlexibleParams) (ReturnFlexibleRow, error) {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[pgsid.Null[int32]](params.Flexible, []int{1, 2}, "ReturnFlexible", "flexible", false)
	if err != nil {
		return ReturnFlexibleRow{}, err
	}
	var row ReturnFlexibleRow
	err = q.db.QueryRow(ctx, ReturnFlexibleSQL, arrayInput1, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Flexible, []int{1, 2}, "ReturnFlexible", "flexible", false)))
	return row, err
}
