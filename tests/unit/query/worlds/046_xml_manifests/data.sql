INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<manifest/>','<source/>','<manifest/>','<source/>',true,true,false,false);

INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<r/>','<w/>','1.0','go','<r/><w/>','<r/><w/>','<?dispatch_x1F60A_ go?>',false);

INSERT INTO manifest_envelopes(fragment,label,tags,sequence,expected_element,expected_forest,bypass)
VALUES ('<parcel/>','é&',ARRAY['a&',NULL,'b<'],7,'<envelope note_x1F60A_="&#xE9;&amp;" sequence="7"><label>é&amp;</label><element>a&amp;</element><element>b&lt;</element><parcel/></envelope>','<document><parcel/></document><note_x1F60A_>é&amp;</note_x1F60A_><tags><element>a&amp;</element><element>b&lt;</element></tags><sequence>7</sequence>',false);
