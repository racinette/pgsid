package documentparts

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
)

const GetPartsSQL = "WITH selected AS (\n  SELECT payload FROM public.items WHERE id = $1\n)\nSELECT\n  payload -> 'nested' AS nested,\n  payload -> 'members' AS members,\n  payload -> 'members' -> 0 AS first_member,\n  payload -> 'members' -> -1 AS last_member,\n  payload -> 'members' -> 0 -> 'profile' AS profile,\n  payload -> 'lookup' -> 'key' AS lookup_value,\n  payload -> 'node' AS node\nFROM selected;"

type GetPartsParams struct {
	Id *int64 `db:"id"`
}
type GetPartsRow struct {
	Nested      *jsonschemas.DocumentNested             `db:"nested"`
	Members     []*jsonschemas.DocumentMembersItem      `db:"members"`
	FirstMember *jsonschemas.DocumentMembersItem        `db:"first_member"`
	LastMember  *jsonschemas.DocumentMembersItem        `db:"last_member"`
	Profile     *jsonschemas.DocumentMembersItemProfile `db:"profile"`
	LookupValue *jsonschemas.DocumentLookupValue        `db:"lookup_value"`
	Node        *jsonschemas.DocumentNode               `db:"node"`
}

func (q *Queries) GetParts(ctx context.Context, params GetPartsParams) (GetPartsRow, error) {
	var row GetPartsRow
	err := q.db.QueryRow(ctx, GetPartsSQL, params.Id).Scan(&row.Nested, &row.Members, &row.FirstMember, &row.LastMember, &row.Profile, &row.LookupValue, &row.Node)
	return row, err
}
