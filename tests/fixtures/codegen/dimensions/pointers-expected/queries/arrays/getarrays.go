package arrays

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	public "example.com/pgsid-validation/generated/schema/public"
	"github.com/jackc/pgx/v5/pgtype"
)

const GetArraysSQL = "SELECT ordinary, matrix, cube, flexible, optional_flexible, owners FROM arrays WHERE id = $1;"

type GetArraysParams struct {
	Id *int32 `db:"id"`
}
type GetArraysRow struct {
	Ordinary         []int32              `db:"ordinary"`
	Matrix           [][]int32            `db:"matrix"`
	Cube             [][][]int32          `db:"cube"`
	Flexible         pgtype.Array[int32]  `db:"flexible"`
	OptionalFlexible *pgtype.Array[int32] `db:"optional_flexible"`
	Owners           [][]public.UserId    `db:"owners"`
}

func (q *Queries) GetArrays(ctx context.Context, params GetArraysParams) (GetArraysRow, error) {
	var row GetArraysRow
	err := q.db.QueryRow(ctx, GetArraysSQL, params.Id).Scan(&row.Ordinary, pgsidpgx.ArrayTarget[int32](&row.Matrix, []int{2}, "GetArrays", "matrix", false), pgsidpgx.ArrayTarget[int32](&row.Cube, []int{3}, "GetArrays", "cube", true), pgsidpgx.ArrayTarget[int32](&row.Flexible, []int{1, 2}, "GetArrays", "flexible", false), pgsidpgx.ArrayTarget[int32](&row.OptionalFlexible, []int{1, 2}, "GetArrays", "optional_flexible", true), pgsidpgx.ArrayTarget[public.UserId](&row.Owners, []int{2}, "GetArrays", "owners", false))
	return row, err
}
