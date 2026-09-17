package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	public "example.com/pgsid-validation/generated/schema/public"
	"github.com/jackc/pgx/v5/pgtype"
)

const GetArraysSQL = "SELECT ordinary, matrix, cube, flexible, optional_flexible, owners FROM arrays WHERE id = $1;"

type GetArraysParams struct {
	Id pgsid.Null[int32] `db:"id"`
}
type GetArraysRow struct {
	Ordinary         []pgsid.Null[int32]                         `db:"ordinary"`
	Matrix           [][]pgsid.Null[int32]                       `db:"matrix"`
	Cube             pgsid.Null[[][][]pgsid.Null[int32]]         `db:"cube"`
	Flexible         pgtype.Array[pgsid.Null[int32]]             `db:"flexible"`
	OptionalFlexible pgsid.Null[pgtype.Array[pgsid.Null[int32]]] `db:"optional_flexible"`
	Owners           [][]pgsid.Null[public.UserId]               `db:"owners"`
}

func (q *Queries) GetArrays(ctx context.Context, params GetArraysParams) (GetArraysRow, error) {
	var row GetArraysRow
	err := q.db.QueryRow(ctx, GetArraysSQL, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(&row.Ordinary, pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Matrix, []int{2}, "GetArrays", "matrix", false), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Cube, []int{3}, "GetArrays", "cube", true), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Flexible, []int{1, 2}, "GetArrays", "flexible", false), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.OptionalFlexible, []int{1, 2}, "GetArrays", "optional_flexible", true), pgsidpgx.ArrayTarget[pgsid.Null[public.UserId]](&row.Owners, []int{2}, "GetArrays", "owners", false)))
	return row, err
}
