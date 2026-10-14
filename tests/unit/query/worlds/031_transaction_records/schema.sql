-- @world checks
CREATE DOMAIN stored_transaction AS xid;
CREATE DOMAIN nested_transaction AS stored_transaction;
CREATE DOMAIN stored_command AS cid;
CREATE DOMAIN stored_full_transaction AS xid8;
CREATE DOMAIN nested_full_transaction AS stored_full_transaction;
CREATE TABLE transaction_events (
 id integer PRIMARY KEY,
 label text NOT NULL,
 transaction_word nested_transaction,
 reference_word xid,
 signed_word integer,
 recorded_wire bytea,
 recorded_text text,
 CONSTRAINT transaction_same CHECK (xideq(transaction_word,reference_word)),
 CONSTRAINT transaction_mixed CHECK (xideqint4(transaction_word,signed_word)),
 CONSTRAINT transaction_wire CHECK (xidsend(transaction_word)=recorded_wire),
 CONSTRAINT transaction_text CHECK (transaction_word::text=recorded_text)
);
CREATE TABLE command_events (
 id integer PRIMARY KEY,
 transaction_id integer NOT NULL REFERENCES transaction_events(id),
 label text NOT NULL,
 command_word stored_command,
 reference_word cid,
 recorded_wire bytea,
 recorded_text text,
 CONSTRAINT command_same CHECK (cideq(command_word,reference_word)),
 CONSTRAINT command_wire CHECK (cidsend(command_word)=recorded_wire),
 CONSTRAINT command_text CHECK (command_word::text=recorded_text)
);
CREATE TABLE full_transaction_events (
 id integer PRIMARY KEY,
 transaction_id integer NOT NULL REFERENCES transaction_events(id),
 label text NOT NULL,
 full_word nested_full_transaction,
 reference_word xid8,
 hash_reference xid8,
 hash_seed bigint,
 recorded_low xid,
 recorded_wire bytea,
 recorded_text text,
 recorded_order integer,
 recorded_large xid8,
 recorded_small xid8,
 CONSTRAINT full_wire CHECK (xid8send(full_word)=recorded_wire),
 CONSTRAINT full_text CHECK (full_word::text=recorded_text),
 CONSTRAINT full_low CHECK (xideq(full_word::xid,recorded_low)),
 CONSTRAINT full_order CHECK (xid8cmp(full_word,reference_word)=recorded_order),
 CONSTRAINT full_selection CHECK (xid8eq(xid8_larger(full_word,reference_word),recorded_large) AND xid8eq(xid8_smaller(full_word,reference_word),recorded_small)),
 CONSTRAINT full_hash CHECK (hashxid8(full_word)=hashxid8(hash_reference) AND hashxid8extended(full_word,hash_seed)=hashxid8extended(hash_reference,hash_seed))
);
CREATE TABLE identifier_imports (
 id integer PRIMARY KEY,
 transaction_id integer NOT NULL REFERENCES transaction_events(id),
 label text NOT NULL,
 source text,
 recorded_transaction xid,
 recorded_command cid,
 recorded_full xid8,
 skip_validation boolean NOT NULL,
 CONSTRAINT import_transaction CHECK (CASE WHEN skip_validation THEN true ELSE xideq(source::xid,recorded_transaction) END),
 CONSTRAINT import_command CHECK (CASE WHEN skip_validation THEN true ELSE cideq(source::cid,recorded_command) END),
 CONSTRAINT import_full CHECK (CASE WHEN skip_validation THEN true ELSE xid8eq(source::xid8,recorded_full) END)
);
