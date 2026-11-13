package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const InsertFromCteSQL = "WITH input AS (SELECT $1::integer[] AS matrix, $2::integer[] AS flexible)\nINSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nSELECT 1, ARRAY[1], matrix, flexible, ARRAY[1]::user_id[] FROM input;"

type InsertFromCteParams struct {
	Matrix   pgsid.Null[[][]pgsid.Null[int32]]              `db:"matrix"`
	Flexible pgsid.Null[pgsid.Array1Or2[pgsid.Null[int32]]] `db:"flexible"`
}

func (q *Queries) InsertFromCte(ctx context.Context, params InsertFromCteParams) error {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[pgsid.Null[int32]](pgsidpgx.Value(params.Matrix), []int{2}, "sql.codegen.go.mappings.column[\"public.arrays.matrix\"].dimensions", "InsertFromCte", "matrix", true)
	if err != nil {
		return err
	}
	arrayInput2, err := pgsidpgx.ValidateArrayInput[pgsid.Null[int32]](pgsidpgx.Value(params.Flexible), []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.flexible\"].dimensions", "InsertFromCte", "flexible", true)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertFromCteSQL, arrayInput1, arrayInput2)
	return err
}
