package arrays

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const SharedDimensionsSQL = "INSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nVALUES (1, ARRAY[1], $1, $1, ARRAY[1]::user_id[]);"

type SharedDimensionsParams struct {
	Shared [][]int32 `db:"shared"`
}

func (q *Queries) SharedDimensions(ctx context.Context, params SharedDimensionsParams) error {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[int32](params.Shared, []int{2}, "the array dimensions declared for its source columns", "SharedDimensions", "shared", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, SharedDimensionsSQL, arrayInput1)
	return err
}
