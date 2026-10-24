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

CREATE TABLE manifest_assemblies (
  fragment xml,
  trailer xml,
  version_label text,
  instruction text,
  expected_concat text,
  expected_root text,
  expected_instruction text,
  bypass boolean NOT NULL,
  CONSTRAINT assembled_content CHECK (CASE WHEN bypass THEN true ELSE xmlconcat(fragment,trailer)::text IS NOT DISTINCT FROM expected_concat END),
  CONSTRAINT rooted_content CHECK (CASE WHEN bypass THEN true ELSE xmlroot(xmlconcat(fragment,trailer),VERSION version_label,STANDALONE NO VALUE)::text IS NOT DISTINCT FROM expected_root END),
  CONSTRAINT dispatch_instruction CHECK (CASE WHEN bypass THEN true ELSE xmlpi(NAME "dispatch😊",instruction)::text IS NOT DISTINCT FROM expected_instruction END),
  CONSTRAINT dispatch_sequence CHECK (CASE WHEN bypass THEN true ELSE xmlpi(NAME sequence,char_length(instruction))::text IN ('<?sequence 2?>','<?sequence 5?>') END)
);

CREATE TABLE manifest_envelopes (
  fragment xml,
  label text,
  tags text[],
  sequence integer,
  expected_element text,
  expected_forest text,
  bypass boolean NOT NULL,
  CONSTRAINT enclosed_manifest CHECK (CASE WHEN bypass THEN true ELSE xmlelement(NAME envelope,XMLATTRIBUTES(label AS "note😊",sequence AS sequence),XMLFOREST(label AS label),tags,fragment)::text IS NOT DISTINCT FROM expected_element END),
  CONSTRAINT manifest_forest CHECK (CASE WHEN bypass THEN true ELSE XMLFOREST(fragment AS document,label AS "note😊",tags AS tags,sequence AS sequence)::text IS NOT DISTINCT FROM expected_forest END)
);

CREATE TYPE manifest_packet AS (document xml, attachments xml[]);

CREATE TABLE manifest_packets (
  fragments xml[],
  packet manifest_packet,
  expected_first text,
  expected_array jsonb,
  expected_packet jsonb,
  expected_display text,
  bypass boolean NOT NULL,
  CONSTRAINT packet_fragment_storage CHECK (CASE WHEN bypass THEN true ELSE fragments[-2]::text IS NOT DISTINCT FROM expected_first END),
  CONSTRAINT packet_array_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(fragments) IS NOT DISTINCT FROM expected_array END),
  CONSTRAINT packet_record_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(packet) IS NOT DISTINCT FROM expected_packet END),
  CONSTRAINT packet_array_display CHECK (CASE WHEN bypass THEN true ELSE fragments::text IS NOT DISTINCT FROM expected_display END)
);

CREATE TABLE manifest_templates (
  expected_storage text,
  expected_attachment text,
  expected_json jsonb,
  bypass boolean NOT NULL,
  CONSTRAINT template_storage CHECK (CASE WHEN bypass THEN true ELSE ($template$("<?xml version=\"1.0\"?><template/>","{\"<?xml version=\\\"1.0\\\"?><attachment/>\"}")$template$::manifest_packet).document::text IS NOT DISTINCT FROM expected_storage END),
  CONSTRAINT template_attachment CHECK (CASE WHEN bypass THEN true ELSE (($template$("<?xml version=\"1.0\"?><template/>","{\"<?xml version=\\\"1.0\\\"?><attachment/>\"}")$template$::manifest_packet).attachments)[1]::text IS NOT DISTINCT FROM expected_attachment END),
  CONSTRAINT template_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb($template$("<?xml version=\"1.0\"?><template/>","{\"<?xml version=\\\"1.0\\\"?><attachment/>\"}")$template$::manifest_packet) IS NOT DISTINCT FROM expected_json END),
  CONSTRAINT template_history CHECK (CASE WHEN bypass THEN true ELSE (($history$[0:1]={"(\"<?xml version=\\\"1.0\\\"?><template/>\",\"{\\\"<?xml version=\\\\\\\"1.0\\\\\\\"?><attachment/>\\\"}\")",NULL}$history$::manifest_packet[])[0]).document::text IS NOT DISTINCT FROM expected_storage END)
);

CREATE TABLE manifest_previews (
  manifest xml,
  expected_content text,
  expected_document text,
  require_document boolean,
  bypass boolean NOT NULL,
  CONSTRAINT preview_content CHECK (CASE WHEN bypass THEN true ELSE XMLSERIALIZE(CONTENT manifest AS text INDENT) IS NOT DISTINCT FROM expected_content END),
  CONSTRAINT preview_document CHECK (CASE WHEN bypass OR NOT require_document THEN true ELSE XMLSERIALIZE(DOCUMENT manifest AS text INDENT) IS NOT DISTINCT FROM expected_document END),
  CONSTRAINT preview_json CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(XMLSERIALIZE(CONTENT manifest AS text INDENT)) IS NOT DISTINCT FROM to_jsonb(expected_content) END)
);

CREATE TABLE manifest_queries (
  manifest xml,
  expression text,
  namespaces text[],
  expected_first text,
  expected_count integer,
  expected_exists boolean,
  use_standard boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT query_first CHECK (CASE WHEN bypass THEN true ELSE (xpath(expression,manifest,namespaces))[1]::text IS NOT DISTINCT FROM expected_first END),
  CONSTRAINT query_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(xpath(expression,manifest,namespaces)) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT query_exists CHECK (CASE WHEN bypass THEN true ELSE xpath_exists(expression,manifest,namespaces) IS NOT DISTINCT FROM expected_exists END),
  CONSTRAINT query_standard CHECK (CASE WHEN bypass OR NOT use_standard THEN true ELSE XMLEXISTS(expression PASSING BY REF manifest BY REF) IS NOT DISTINCT FROM expected_exists END)
);
