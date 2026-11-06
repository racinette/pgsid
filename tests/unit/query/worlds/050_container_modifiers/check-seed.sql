-- name: RecordFieldsFit
INSERT INTO bit_modifiers(source,bypass) VALUES ('("{101}","{10}")',false);

-- name: RecordFixedTooLong
INSERT INTO bit_modifiers(source,bypass) VALUES ('("{1010}","{10}")',false);

-- name: RecordVaryingTooLong
INSERT INTO bit_modifiers(source,bypass) VALUES ('("{101}","{101}")',false);

-- name: RecordFieldMismatch
INSERT INTO bit_modifiers(source,bypass) VALUES ('("{111}","{1}")',false);

-- name: RecordNullFields
INSERT INTO bit_modifiers(source,bypass) VALUES ('(,)',false);

-- name: RecordBypassed
INSERT INTO bit_modifiers(source,bypass) VALUES ('garbage',true);

-- name: DomainsFit
INSERT INTO bit_domains(fixed_source,short_source,bypass) VALUES ('{101}','{1}',false);

-- name: FixedDomainTooShort
INSERT INTO bit_domains(fixed_source,short_source,bypass) VALUES ('{10}','{1}',false);

-- name: ShortDomainTooLong
INSERT INTO bit_domains(fixed_source,short_source,bypass) VALUES ('{101}','{111}',false);

-- name: ShortDomainEmpty
INSERT INTO bit_domains(fixed_source,short_source,bypass) VALUES ('{101}','{}',false);

-- name: FixedDomainTwo
INSERT INTO bit_domains(fixed_source,short_source,bypass) VALUES ('{101,011}','{1}',false);

-- name: BoundsMatch
INSERT INTO array_bounds(source,values_column,bypass) VALUES ('[2:3]={1,2}','[0:1]={1,2}',false);

-- name: BoundsDefault
INSERT INTO array_bounds(source,values_column,bypass) VALUES ('{1,2}','{1,2}',false);

-- name: BoundsShifted
INSERT INTO array_bounds(source,values_column,bypass) VALUES ('[2:3]={1,2}','[1:2]={1,2}',false);

-- name: BoundsMalformed
INSERT INTO array_bounds(source,values_column,bypass) VALUES ('[3:2]={1,2}','[0:1]={1,2}',false);

-- name: BoundsNull
INSERT INTO array_bounds(source,values_column,bypass) VALUES (NULL,NULL,false);

-- name: ContextReading
INSERT INTO context_nullness(reading,readings,bypass) VALUES (1.5,'{1.5,2}',false);

-- name: ContextNullReading
INSERT INTO context_nullness(reading,readings,bypass) VALUES (NULL,NULL,false);

-- name: ContextNullElement
INSERT INTO context_nullness(reading,readings,bypass) VALUES (0.1,'{0.1,NULL}',false);

-- name: ContextEmpty
INSERT INTO context_nullness(reading,readings,bypass) VALUES (2,'{}',false);
