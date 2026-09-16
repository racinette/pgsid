package items

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/queries/jsonschemas"
)

const ListItemsSQL = "SELECT id, user_id, state, payload, maybe_payload, numbers, metadata, payload -> 'requiredNullable' AS nullable_value FROM public.items;"

type ListItemsParams struct {
}
type ListItemsRow struct {
	Id            int64                     `db:"id"`
	UserId        *any                      `db:"user_id"`
	State         *any                      `db:"state"`
	Payload       *jsonschemas.Document     `db:"payload"`
	MaybePayload  jsonschemas.MaybeDocument `db:"maybe_payload"`
	Numbers       []int64                   `db:"numbers"`
	Metadata      *any                      `db:"metadata"`
	NullableValue *string                   `db:"nullable_value"`
}

func (q *Queries) ListItems(ctx context.Context) ([]ListItemsRow, error) {
	rows, err := q.db.Query(ctx, ListItemsSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]ListItemsRow, 0)
	for rows.Next() {
		var row ListItemsRow
		if err := rows.Scan(&row.Id, &row.UserId, &row.State, &row.Payload, &row.MaybePayload, &row.Numbers, &row.Metadata, &row.NullableValue); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
