package documentparts

import pgsid "example.com/pgsid-nulls/generated/queries/pgsid/pgx"

type Queries struct {
	db pgsid.DBTX
}

func New(db pgsid.DBTX) *Queries {
	return &Queries{db: db}
}
