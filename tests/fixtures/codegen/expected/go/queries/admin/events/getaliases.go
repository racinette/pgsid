package events

import (
	"context"
	billing_extra2 "example.com/pgsid-fixture/generated/go/schema/billing.extra"
	billing_extra "example.com/pgsid-fixture/generated/go/schema/billing_extra"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const GetAliasesSQL = "SELECT p.id AS public_id, q.id AS dotted_id, r.id AS underscored_id\nFROM public.events p, \"billing.extra\".events q, billing_extra.events r;"

type GetAliasesParams struct {
}
type GetAliasesRow struct {
	PublicId      public.EventId         `db:"public_id"`
	DottedId      billing_extra2.EventId `db:"dotted_id"`
	UnderscoredId billing_extra.EventId  `db:"underscored_id"`
}

func (q *Queries) GetAliases(ctx context.Context) (GetAliasesRow, error) {
	var row GetAliasesRow
	err := q.db.QueryRow(ctx, GetAliasesSQL).Scan(&row.PublicId, &row.DottedId, &row.UnderscoredId)
	return row, err
}
