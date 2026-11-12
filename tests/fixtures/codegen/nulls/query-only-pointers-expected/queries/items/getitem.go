package items

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/queries/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/queries/pgsid"
)

const GetItemSQL = "SELECT id, user_id, state, payload, maybe_payload, numbers, metadata, payload -> 'requiredNullable' AS nullable_value FROM public.items WHERE id = $1;"

type GetItemParams struct {
	Id *int64 `db:"id"`
}
type GetItemRow struct {
	Id            int64                                 `db:"id"`
	UserId        *any                                  `db:"user_id"`
	State         *any                                  `db:"state"`
	Payload       *pgsid.JSON[jsonschemas.Document]     `db:"payload"`
	MaybePayload  pgsid.JSON[jsonschemas.MaybeDocument] `db:"maybe_payload"`
	Numbers       []int64                               `db:"numbers"`
	Metadata      *any                                  `db:"metadata"`
	NullableValue *pgsid.JSON[*string]                  `db:"nullable_value"`
}

func (q *Queries) GetItem(ctx context.Context, params GetItemParams) (GetItemRow, error) {
	var row GetItemRow
	err := q.db.QueryRow(ctx, GetItemSQL, params.Id).Scan(&row.Id, &row.UserId, &row.State, pgsid.NullableJSON(&row.Payload), &row.MaybePayload, &row.Numbers, &row.Metadata, pgsid.NullableJSON(&row.NullableValue))
	return row, err
}
