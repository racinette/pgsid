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
