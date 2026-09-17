package arrays

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const UpdateFlexibleSQL = "UPDATE arrays SET flexible = $1, optional_flexible = $2 WHERE id = $3;"

type UpdateFlexibleParams struct {
	Flexible pgtype.Array[int32]  `db:"flexible"`
	Optional *pgtype.Array[int32] `db:"optional"`
	Id       *int32               `db:"id"`
}

func (q *Queries) UpdateFlexible(ctx context.Context, params UpdateFlexibleParams) (int64, error) {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[int32](params.Flexible, []int{1, 2}, "UpdateFlexible", "flexible", false)
	if err != nil {
		return 0, err
	}
	arrayInput2, err := pgsidpgx.ValidateArrayInput[int32](params.Optional, []int{1, 2}, "UpdateFlexible", "optional", true)
	if err != nil {
		return 0, err
	}
	tag, err := q.db.Exec(ctx, UpdateFlexibleSQL, arrayInput1, arrayInput2, params.Id)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
