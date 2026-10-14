-- @world checks
CREATE DOMAIN stored_pointer AS tid;
CREATE DOMAIN nested_pointer AS stored_pointer;
CREATE TABLE heap_records (
 id integer PRIMARY KEY,
 label text NOT NULL,
 pointer nested_pointer,
 reference tid,
 recorded_wire bytea,
 recorded_text text,
 recorded_order integer,
 recorded_large tid,
 recorded_small tid,
 recorded_coalesced tid,
 CONSTRAINT pointer_wire CHECK(tidsend(pointer)=recorded_wire),
 CONSTRAINT pointer_text CHECK(pointer::text=recorded_text),
 CONSTRAINT pointer_order CHECK(bttidcmp(pointer,reference)=recorded_order AND tideq(pointer,reference)=(recorded_order=0) AND tidne(pointer,reference)=(recorded_order<>0) AND tidlt(pointer,reference)=(recorded_order<0) AND tidle(pointer,reference)=(recorded_order<=0) AND tidgt(pointer,reference)=(recorded_order>0) AND tidge(pointer,reference)=(recorded_order>=0)),
 CONSTRAINT pointer_selection CHECK(tidlarger(pointer,reference)=recorded_large AND tidsmaller(pointer,reference)=recorded_small),
 CONSTRAINT pointer_coalesced CHECK(COALESCE(pointer,reference)=recorded_coalesced)
);
CREATE TABLE heap_hashes (
 id integer PRIMARY KEY,
 record_id integer NOT NULL REFERENCES heap_records(id),
 label text NOT NULL,
 pointer stored_pointer,
 seed bigint,
 recorded_hash integer,
 recorded_extended bigint,
 CONSTRAINT pointer_hash CHECK(hashtid(pointer)=recorded_hash),
 CONSTRAINT pointer_extended CHECK(hashtidextended(pointer,seed)=recorded_extended)
);
CREATE TABLE heap_imports (
 id integer PRIMARY KEY,
 record_id integer NOT NULL REFERENCES heap_records(id),
 label text NOT NULL,
 source text,
 recorded_pointer tid,
 recorded_wire bytea,
 recorded_present boolean,
 skip_validation boolean NOT NULL,
 CONSTRAINT imported_pointer CHECK(CASE WHEN skip_validation THEN true ELSE source::nested_pointer=recorded_pointer END),
 CONSTRAINT imported_wire CHECK(CASE WHEN skip_validation THEN true ELSE tidsend(source::tid)=recorded_wire END),
 CONSTRAINT imported_present CHECK(CASE WHEN skip_validation THEN true ELSE (source::tid IS NOT NULL)=recorded_present END)
);
