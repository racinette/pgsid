package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const InsertFromCteSQL = "WITH input AS (SELECT $1::integer[] AS matrix, $2::integer[] AS flexible)\nINSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nSELECT 1, ARRAY[1], matrix, flexible, ARRAY[1]::user_id[] FROM input;"

type InsertFromCteParams struct {
	Matrix   pgsid.Null[[][]pgsid.Null[int32]]           `db:"matrix"`
	Flexible pgsid.Null[pgtype.Array[pgsid.Null[int32]]] `db:"flexible"`
}

func (q *Queries) InsertFromCte(ctx context.Context, params InsertFromCteParams) error {
	arrayInput2, err := pgsidpgx.ValidateArrayInput[pgsid.Null[int32]](pgsidpgx.Value(params.Flexible), []int{1, 2}, "InsertFromCte", "flexible", true)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertFromCteSQL, pgsidpgx.Value(params.Matrix), arrayInput2)
	return err
}
