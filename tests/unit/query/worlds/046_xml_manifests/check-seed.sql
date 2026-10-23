-- name: ExportDocument
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<manifest/>','<source/>','<manifest/>','<source/>',true,true,false,false);

-- name: ExportContent
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<a/><b/>','plain','<a/><b/>','plain',false,false,false,false);

-- name: RetainDeclaration
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<?xml version="1.0" encoding=""?><manifest/>','<source/>','<?xml version="1.0" encoding=""?><manifest/>','<source/>',false,false,true,false);

-- name: RetainWhitespace
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<manifest> <entry/> </manifest>','<source> <entry/> </source>','<manifest> <entry/> </manifest>','<source> <entry/> </source>',true,true,false,false);

-- name: UnicodeDocument
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<文書>😊</文書>','<source>雪</source>','<文書>😊</文書>','<source>雪</source>',true,true,false,false);

-- name: NullManifest
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES (NULL,NULL,NULL,NULL,NULL,true,false,false);

-- name: WrongStorage
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<manifest/>','<source/>','wrong','<source/>',true,false,false,false);

-- name: WrongDocumentFlag
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<a/><b/>','plain','<a/><b/>','plain',true,false,false,false);

-- name: WrongParsedSource
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<manifest/>','<source/>','<manifest/>','wrong',true,false,false,false);

-- name: DocumentRequired
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<a/><b/>','plain','<a/><b/>','plain',false,true,false,false);

-- name: InvalidSource
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<manifest/>','<source>','<manifest/>','<source>',true,false,false,false);

-- name: WrongFallback
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES (NULL,NULL,NULL,NULL,NULL,false,true,false);

-- name: SkippedErrors
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<a/><b/>','<source>','wrong','wrong',true,true,true,true);

-- name: TemplateDeclarationRejected
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<?xml version="1.0"?><template/>','<source/>','<?xml version="1.0"?><template/>','<source/>',true,true,false,false);

-- name: TemplateWithoutDeclaration
INSERT INTO manifest_exports(manifest,source,expected_storage,expected_source,expected_document,require_document,fallback,bypass)
VALUES ('<template/>','<source/>','<template/>','<source/>',true,true,false,false);

-- name: AssembleManifest
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<?xml version="1.1" standalone="yes"?><r/>','<?xml version="1.1" standalone="no"?><w/>','1.0','  go ','<?xml version="1.1" standalone="no"?><r/><w/>','<r/><w/>','<?dispatch_x1F60A_ go ?>',false);

-- name: QuotedManifestVersion
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<?xml version=''a"b''?><r/>','<?xml version=''a"b''?><w/>','1.1','go','<?xml version="a"b"?><r/><w/>','<?xml version="1.1"?>','<?dispatch_x1F60A_ go?>',false);

-- name: NullAssembly
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES (NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: WrongAssembly
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<r/>','<w/>','1.0','go','wrong','<r/><w/>','<?dispatch_x1F60A_ go?>',false);

-- name: WrongAssemblyVersion
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<r/>','<w/>','1.0','go','<r/><w/>','wrong','<?dispatch_x1F60A_ go?>',false);

-- name: WrongDispatchInstruction
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<r/>','<w/>','1.0','go','<r/><w/>','<r/><w/>','wrong',false);

-- name: InvalidDispatchInstruction
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<r/>','<w/>','1.0','?>','<r/><w/>','<r/><w/>','wrong',false);

-- name: BypassedAssembly
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<r/>','<w/>','1.0','?>','wrong','wrong','wrong',true);

-- name: InvalidDispatchSequence
INSERT INTO manifest_assemblies(fragment,trailer,version_label,instruction,expected_concat,expected_root,expected_instruction,bypass)
VALUES ('<r/>','<w/>','1.0','silent','<r/><w/>','<r/><w/>','<?dispatch_x1F60A_ silent?>',false);

-- name: EncloseManifest
INSERT INTO manifest_envelopes(fragment,label,tags,sequence,expected_element,expected_forest,bypass)
VALUES ('<parcel/>','é&',ARRAY['a&',NULL,'b<'],7,'<envelope note_x1F60A_="&#xE9;&amp;" sequence="7"><label>é&amp;</label><element>a&amp;</element><element>b&lt;</element><parcel/></envelope>','<document><parcel/></document><note_x1F60A_>é&amp;</note_x1F60A_><tags><element>a&amp;</element><element>b&lt;</element></tags><sequence>7</sequence>',false);

-- name: NullEnvelope
INSERT INTO manifest_envelopes(fragment,label,tags,sequence,expected_element,expected_forest,bypass)
VALUES (NULL,NULL,NULL,NULL,'<envelope/>',NULL,false);

-- name: EmptyTagsEnvelope
INSERT INTO manifest_envelopes(fragment,label,tags,sequence,expected_element,expected_forest,bypass)
VALUES (NULL,NULL,ARRAY[]::text[],NULL,'<envelope></envelope>','<tags></tags>',false);

-- name: EmptyLabelEnvelope
INSERT INTO manifest_envelopes(fragment,label,tags,sequence,expected_element,expected_forest,bypass)
VALUES (NULL,'',NULL,NULL,'<envelope note_x1F60A_=""><label></label></envelope>','<note_x1F60A_></note_x1F60A_>',false);

-- name: WrongAttributeEncoding
INSERT INTO manifest_envelopes(fragment,label,tags,sequence,expected_element,expected_forest,bypass)
VALUES (NULL,'é',NULL,NULL,'<envelope note_x1F60A_="é"><label>é</label></envelope>','<note_x1F60A_>é</note_x1F60A_>',false);

-- name: WrongForestContent
INSERT INTO manifest_envelopes(fragment,label,tags,sequence,expected_element,expected_forest,bypass)
VALUES (NULL,NULL,NULL,NULL,'<envelope/>','wrong',false);

-- name: BypassedEnvelope
INSERT INTO manifest_envelopes(fragment,label,tags,sequence,expected_element,expected_forest,bypass)
VALUES (NULL,'é',ARRAY['bad&'],NULL,'wrong','wrong',true);

-- name: RetainPacketStorage
INSERT INTO manifest_packets(fragments,packet,expected_first,expected_array,expected_packet,expected_display,bypass)
VALUES ($array$[-2:0]={"<?xml version=\"1.0\"?><r/>",NULL,"<é/>"}$array$,
ROW('<?xml version="1.0"?><r/>',$array$[-2:0]={"<?xml version=\"1.0\"?><r/>",NULL,"<é/>"}$array$::xml[])::manifest_packet,
'<?xml version="1.0"?><r/>','["<r/>",null,"<é/>"]','{"document":"<r/>","attachments":["<r/>",null,"<é/>"]}','[-2:0]={<r/>,NULL,<é/>}',false);

-- name: NullPacket
INSERT INTO manifest_packets(fragments,packet,expected_first,expected_array,expected_packet,expected_display,bypass)
VALUES (NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: EmptyPacket
INSERT INTO manifest_packets(fragments,packet,expected_first,expected_array,expected_packet,expected_display,bypass)
VALUES ('{}',ROW(NULL,'{}'::xml[])::manifest_packet,NULL,'[]','{"document":null,"attachments":[]}','{}',false);

-- name: WrongPacketStorage
INSERT INTO manifest_packets(fragments,packet,expected_first,expected_array,expected_packet,expected_display,bypass)
VALUES ('[-2:-2]={<r/>}',NULL,'wrong','["<r/>"]',NULL,'[-2:-2]={<r/>}',false);

-- name: WrongPacketArrayJson
INSERT INTO manifest_packets(fragments,packet,expected_first,expected_array,expected_packet,expected_display,bypass)
VALUES ('[-2:-2]={<r/>}',NULL,'<r/>','["wrong"]',NULL,'[-2:-2]={<r/>}',false);

-- name: WrongPacketRecordJson
INSERT INTO manifest_packets(fragments,packet,expected_first,expected_array,expected_packet,expected_display,bypass)
VALUES (NULL,ROW('<r/>',NULL)::manifest_packet,NULL,NULL,'{"document":"wrong","attachments":null}',NULL,false);

-- name: WrongPacketArrayDisplay
INSERT INTO manifest_packets(fragments,packet,expected_first,expected_array,expected_packet,expected_display,bypass)
VALUES ('[-2:-2]={<r/>}',NULL,'<r/>','["<r/>"]',NULL,'wrong',false);

-- name: BypassedPacket
INSERT INTO manifest_packets(fragments,packet,expected_first,expected_array,expected_packet,expected_display,bypass)
VALUES ('[-2:-2]={<r/>}',ROW('<r/>',NULL)::manifest_packet,'wrong','["wrong"]','{}','wrong',true);

-- name: OriginalTemplateStorage
INSERT INTO manifest_templates(expected_storage,expected_attachment,expected_json,bypass)
VALUES ('<?xml version="1.0"?><template/>','<?xml version="1.0"?><attachment/>','{"document":"<template/>","attachments":["<attachment/>"]}',false);

-- name: WrongTemplateStorage
INSERT INTO manifest_templates(expected_storage,expected_attachment,expected_json,bypass)
VALUES ('<template/>','<?xml version="1.0"?><attachment/>','{"document":"<template/>","attachments":["<attachment/>"]}',false);

-- name: WrongTemplateAttachment
INSERT INTO manifest_templates(expected_storage,expected_attachment,expected_json,bypass)
VALUES ('<?xml version="1.0"?><template/>','<attachment/>','{"document":"<template/>","attachments":["<attachment/>"]}',false);

-- name: WrongTemplateJson
INSERT INTO manifest_templates(expected_storage,expected_attachment,expected_json,bypass)
VALUES ('<?xml version="1.0"?><template/>','<?xml version="1.0"?><attachment/>','{"document":"<template/>","attachments":["wrong"]}',false);

-- name: NullTemplateExpectations
INSERT INTO manifest_templates(expected_storage,expected_attachment,expected_json,bypass)
VALUES (NULL,NULL,NULL,false);

-- name: BypassedTemplate
INSERT INTO manifest_templates(expected_storage,expected_attachment,expected_json,bypass)
VALUES ('wrong','wrong','{}',true);

-- name: IndentedManifest
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<manifest><item/></manifest>',E'<manifest>\n  <item/>\n</manifest>',E'<manifest>\n  <item/>\n</manifest>',true,false);

-- name: MixedManifestText
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<manifest>x<item/></manifest>','<manifest>x<item/></manifest>','<manifest>x<item/></manifest>',true,false);

-- name: DeclaredUnicodeManifest
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<?xml version="1.0"?><manifest>é</manifest>','<manifest>&#xE9;</manifest>',E'<?xml version="1.0" encoding="UTF-8"?>\n<manifest>é</manifest>',true,false);

-- name: ManifestEntityPreview
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<!DOCTYPE manifest [<!ENTITY label "ok">]><manifest>&label;</manifest>',E'<!DOCTYPE manifest [\n<!ENTITY label "ok">\n]>\n<manifest>ok</manifest>\n',E'<!DOCTYPE manifest [\n<!ENTITY label "ok">\n]>\n<manifest>ok</manifest>',true,false);

-- name: ManifestFragmentPreview
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<a/><b/>',E'<a/>\n<b/>',NULL,false,false);

-- name: EmptyManifestPreview
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<manifest></manifest>','<manifest/>','<manifest/>',true,false);

-- name: NullManifestPreview
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES (NULL,NULL,NULL,true,false);

-- name: WrongManifestContentPreview
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<manifest/>','wrong','<manifest/>',true,false);

-- name: WrongManifestDocumentPreview
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<manifest/>','<manifest/>','wrong',true,false);

-- name: FragmentDocumentPreviewError
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<a/><b/>',E'<a/>\n<b/>',NULL,true,false);

-- name: BypassedManifestPreview
INSERT INTO manifest_previews(manifest,expected_content,expected_document,require_document,bypass)
VALUES ('<a/><b/>','wrong','wrong',true,true);
