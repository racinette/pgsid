-- @world checks
CREATE DOMAIN document_xml AS xml
  CHECK (VALUE IS DOCUMENT)
  CHECK (VALUE::text <> '<?xml version="1.0"?><template/>'::xml::text);

CREATE TABLE manifest_exports (
  manifest xml,
  source text,
  expected_storage text,
  expected_source text,
  expected_document boolean,
  require_document boolean,
  fallback boolean,
  bypass boolean NOT NULL,
  CONSTRAINT manifest_storage CHECK (CASE WHEN bypass THEN true ELSE manifest::text IS NOT DISTINCT FROM expected_storage END),
  CONSTRAINT manifest_document CHECK (CASE WHEN bypass THEN true ELSE (manifest IS DOCUMENT) IS NOT DISTINCT FROM expected_document END),
  CONSTRAINT parsed_source CHECK (CASE WHEN bypass THEN true ELSE XMLSERIALIZE(CONTENT XMLPARSE(CONTENT source STRIP WHITESPACE) AS text) IS NOT DISTINCT FROM expected_source END),
  CONSTRAINT document_export CHECK (CASE WHEN bypass OR NOT require_document THEN true ELSE XMLSERIALIZE(DOCUMENT manifest AS varchar(80)) IS NOT DISTINCT FROM expected_storage END),
  CONSTRAINT checked_document CHECK (CASE WHEN bypass OR NOT require_document THEN true ELSE (manifest::document_xml)::text IS NOT DISTINCT FROM expected_storage END),
  CONSTRAINT default_manifest CHECK (CASE WHEN bypass OR NOT fallback THEN true ELSE COALESCE(manifest,'<?xml version="1.0" encoding=""?><manifest/>'::xml)::text IS NOT DISTINCT FROM expected_storage END)
);
