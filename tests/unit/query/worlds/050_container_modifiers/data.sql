INSERT INTO bit_modifiers(source,bypass) VALUES ('("{101}","{10}")',false);
INSERT INTO bit_domains(fixed_source,short_source,bypass) VALUES ('{101}','{1}',false);
INSERT INTO array_bounds(source,values_column,bypass) VALUES ('[2:3]={1,2}','[0:1]={1,2}',false);
INSERT INTO context_nullness(reading,readings,bypass) VALUES (1.5,'{1.5,2}',false);
