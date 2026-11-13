package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	public "example.com/pgsid-validation/generated/schema/public"
)

const InsertArraysSQL = "INSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nVALUES ($1, $2, $3, $4, $5);"

type InsertArraysParams struct {
	Id       int32                  `db:"id"`
	Ordinary []int32                `db:"ordinary"`
	Matrix   [][]int32              `db:"matrix"`
	Flexible pgsid.Array1Or2[int32] `db:"flexible"`
	Owners   [][]public.UserId      `db:"owners"`
}

func (q *Queries) InsertArrays(ctx context.Context, params InsertArraysParams) error {
	arrayInput3, err := pgsidpgx.ValidateArrayInput[int32](params.Matrix, []int{2}, "sql.codegen.go.mappings.column[\"public.arrays.matrix\"].dimensions", "InsertArrays", "matrix", false)
	if err != nil {
		return err
	}
	arrayInput4, err := pgsidpgx.ValidateArrayInput[int32](params.Flexible, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.flexible\"].dimensions", "InsertArrays", "flexible", false)
	if err != nil {
		return err
	}
	arrayInput5, err := pgsidpgx.ValidateArrayInput[public.UserId](params.Owners, []int{2}, "sql.codegen.go.mappings.column[\"public.arrays.owners\"].dimensions", "InsertArrays", "owners", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertArraysSQL, params.Id, params.Ordinary, arrayInput3, arrayInput4, arrayInput5)
	return err
}
