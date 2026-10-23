INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<manifest/>','<source/>','<manifest/>','<source/>',true,true,false,false);

INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<r/>','<w/>','1.0','go','<r/><w/>','<r/><w/>','<?dispatch_x1F60A_ go?>',false);
