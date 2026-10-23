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
