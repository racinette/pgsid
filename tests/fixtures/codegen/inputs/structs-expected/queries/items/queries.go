package items

import pgsid "example.com/pgsid-validation/generated/queries/pgsid/pgx"

type Queries struct {
	db pgsid.DBTX
}

func New(db pgsid.DBTX) *Queries {
	pgsid.Prepare(db)
	return &Queries{db: db}
}
