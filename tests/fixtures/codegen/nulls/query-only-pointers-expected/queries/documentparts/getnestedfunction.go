package documentparts

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/queries/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/queries/pgsid"
)

const GetNestedFunctionSQL = "SELECT jsonb_extract_path(payload, 'nested') AS nested FROM public.items WHERE id = $1;"

type GetNestedFunctionParams struct {
	Id *int64 `db:"id"`
}
type GetNestedFunctionRow struct {
	Nested *pgsid.JSON[jsonschemas.DocumentNested] `db:"nested"`
}

func (q *Queries) GetNestedFunction(ctx context.Context, params GetNestedFunctionParams) (GetNestedFunctionRow, error) {
	var row GetNestedFunctionRow
	err := q.db.QueryRow(ctx, GetNestedFunctionSQL, params.Id).Scan(pgsid.NullableJSON(&row.Nested))
	return row, err
}
