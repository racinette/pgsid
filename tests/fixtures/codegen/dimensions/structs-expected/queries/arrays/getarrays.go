package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	public "example.com/pgsid-validation/generated/schema/public"
)

const GetArraysSQL = "SELECT ordinary, matrix, cube, flexible, optional_flexible, owners FROM arrays WHERE id = $1;"

type GetArraysParams struct {
	Id pgsid.Null[int32] `db:"id"`
}
type GetArraysRow struct {
	Ordinary         []pgsid.Null[int32]                            `db:"ordinary"`
	Matrix           [][]pgsid.Null[int32]                          `db:"matrix"`
	Cube             pgsid.Null[[][][]pgsid.Null[int32]]            `db:"cube"`
	Flexible         pgsid.Array1Or2[pgsid.Null[int32]]             `db:"flexible"`
	OptionalFlexible pgsid.Null[pgsid.Array1Or2[pgsid.Null[int32]]] `db:"optional_flexible"`
	Owners           [][]pgsid.Null[public.UserId]                  `db:"owners"`
}

func (q *Queries) GetArrays(ctx context.Context, params GetArraysParams) (GetArraysRow, error) {
	var row GetArraysRow
	err := q.db.QueryRow(ctx, GetArraysSQL, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(&row.Ordinary, pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Matrix, nil, []int{2}, "sql.codegen.go.mappings.column[\"public.arrays.matrix\"].dimensions", "GetArrays", "matrix", false), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Cube, nil, []int{3}, "sql.codegen.go.mappings.column[\"public.arrays.cube\"].dimensions", "GetArrays", "cube", true), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Flexible, []any{pgsid.D1[pgsid.Null[int32]](nil), pgsid.D2[pgsid.Null[int32]](nil)}, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.flexible\"].dimensions", "GetArrays", "flexible", false), pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.OptionalFlexible, []any{pgsid.D1[pgsid.Null[int32]](nil), pgsid.D2[pgsid.Null[int32]](nil)}, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.optional_flexible\"].dimensions", "GetArrays", "optional_flexible", true), pgsidpgx.ArrayTarget[pgsid.Null[public.UserId]](&row.Owners, nil, []int{2}, "sql.codegen.go.mappings.column[\"public.arrays.owners\"].dimensions", "GetArrays", "owners", false)))
	return row, err
}
