package documents

import pgsid "example.com/pgsid-validation/generated/queries/pgsid/pgx"

type Queries struct {
	db pgsid.DBTX
}

func New(db pgsid.DBTX) *Queries {
	return &Queries{db: db}
}
