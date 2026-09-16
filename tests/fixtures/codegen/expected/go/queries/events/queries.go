package events

import pgsid "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx"

type Queries struct {
	db pgsid.DBTX
}

func New(db pgsid.DBTX) *Queries {
	return &Queries{db: db}
}
