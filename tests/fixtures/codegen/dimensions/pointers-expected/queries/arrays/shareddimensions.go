package arrays

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const SharedDimensionsSQL = "INSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nVALUES (1, ARRAY[1], $1, $1, ARRAY[1]::user_id[]);"

type SharedDimensionsParams struct {
	Shared pgtype.Array[int32] `db:"shared"`
}

func (q *Queries) SharedDimensions(ctx context.Context, params SharedDimensionsParams) error {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[int32](params.Shared, []int{2}, "SharedDimensions", "shared", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, SharedDimensionsSQL, arrayInput1)
	return err
}
