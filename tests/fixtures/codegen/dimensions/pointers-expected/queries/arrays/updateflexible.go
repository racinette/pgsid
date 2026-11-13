package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const UpdateFlexibleSQL = "UPDATE arrays SET flexible = $1, optional_flexible = $2 WHERE id = $3;"

type UpdateFlexibleParams struct {
	Flexible pgsid.Array1Or2[int32] `db:"flexible"`
	Optional pgsid.Array1Or2[int32] `db:"optional"`
	Id       *int32                 `db:"id"`
}

func (q *Queries) UpdateFlexible(ctx context.Context, params UpdateFlexibleParams) (int64, error) {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[int32](params.Flexible, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.flexible\"].dimensions", "UpdateFlexible", "flexible", false)
	if err != nil {
		return 0, err
	}
	arrayInput2, err := pgsidpgx.ValidateArrayInput[int32](params.Optional, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.optional_flexible\"].dimensions", "UpdateFlexible", "optional", true)
	if err != nil {
		return 0, err
	}
	tag, err := q.db.Exec(ctx, UpdateFlexibleSQL, arrayInput1, arrayInput2, params.Id)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
