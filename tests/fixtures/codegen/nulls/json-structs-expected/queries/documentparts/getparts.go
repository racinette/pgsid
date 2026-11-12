package documentparts

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/pgsid"
)

const GetPartsSQL = "WITH selected AS (\n  SELECT payload FROM public.items WHERE id = $1\n)\nSELECT\n  payload -> 'nested' AS nested,\n  payload -> 'members' AS members,\n  payload -> 'members' -> 0 AS first_member,\n  payload -> 'members' -> -1 AS last_member,\n  payload -> 'members' -> 0 -> 'profile' AS profile,\n  payload -> 'lookup' -> 'key' AS lookup_value,\n  payload -> 'node' AS node\nFROM selected;"

type GetPartsParams struct {
	Id *int64 `db:"id"`
}
type GetPartsRow struct {
	Nested      *pgsid.JSON[jsonschemas.DocumentNested]                    `db:"nested"`
	Members     *pgsid.JSON[[]pgsid.Null[jsonschemas.DocumentMembersItem]] `db:"members"`
	FirstMember *pgsid.JSON[pgsid.Null[jsonschemas.DocumentMembersItem]]   `db:"first_member"`
	LastMember  *pgsid.JSON[pgsid.Null[jsonschemas.DocumentMembersItem]]   `db:"last_member"`
	Profile     *pgsid.JSON[jsonschemas.DocumentMembersItemProfile]        `db:"profile"`
	LookupValue *pgsid.JSON[jsonschemas.DocumentLookupValue]               `db:"lookup_value"`
	Node        *pgsid.JSON[jsonschemas.DocumentNode]                      `db:"node"`
}

func (q *Queries) GetParts(ctx context.Context, params GetPartsParams) (GetPartsRow, error) {
	var row GetPartsRow
	err := q.db.QueryRow(ctx, GetPartsSQL, params.Id).Scan(pgsid.NullableJSON(&row.Nested), pgsid.NullableJSON(&row.Members), pgsid.NullableJSON(&row.FirstMember), pgsid.NullableJSON(&row.LastMember), pgsid.NullableJSON(&row.Profile), pgsid.NullableJSON(&row.LookupValue), pgsid.NullableJSON(&row.Node))
	return row, err
}
