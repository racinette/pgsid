-- @world checks
CREATE TYPE inspection_reading AS (score integer, label text COLLATE "C", span int4range);
CREATE TYPE inspection_packet AS (current_reading inspection_reading, previous_reading inspection_reading, history inspection_reading[]);
CREATE TABLE inspection_reports (
  packet inspection_packet,
  backup inspection_packet,
  expected_null boolean,
  expected_present boolean,
  use_primary boolean NOT NULL,
  bypass boolean NOT NULL,
  CONSTRAINT reading_score CHECK (CASE WHEN bypass THEN true ELSE (packet).current_reading.score >= 2 END),
  CONSTRAINT reading_label CHECK (CASE WHEN bypass THEN true ELSE length((packet).current_reading.label) >= 2 END),
  CONSTRAINT reading_window CHECK (CASE WHEN bypass THEN true ELSE lower((packet).current_reading.span) <= 10 END),
  CONSTRAINT history_score CHECK (CASE WHEN bypass THEN true ELSE ((packet).history[1]).score >= 2 END),
  CONSTRAINT packet_null CHECK (CASE WHEN bypass THEN true ELSE (packet IS NULL) = expected_null END),
  CONSTRAINT packet_present CHECK (CASE WHEN bypass THEN true ELSE (packet IS NOT NULL) = expected_present END),
  CONSTRAINT fallback_score CHECK (CASE WHEN bypass THEN true ELSE (COALESCE(packet, backup)).current_reading.score >= 2 END),
  CONSTRAINT selected_score CHECK (CASE WHEN bypass THEN true ELSE (CASE WHEN use_primary THEN packet ELSE backup END).current_reading.score >= 2 END)
);
