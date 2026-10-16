-- @world checks
CREATE DOMAIN lane_slots AS integer[];
CREATE TABLE lane_allocations (
  slots lane_slots,
  standby integer[],
  requested_dimension integer,
  slot_limit integer,
  required_dimensions integer,
  first_slot integer,
  last_slot integer,
  layout text,
  use_standby boolean,
  CONSTRAINT slot_capacity CHECK (cardinality(slots) <= slot_limit),
  CONSTRAINT layout_rank CHECK (array_ndims(slots) IS NOT DISTINCT FROM required_dimensions),
  CONSTRAINT lane_capacity CHECK (array_length(slots, requested_dimension) <= slot_limit),
  CONSTRAINT first_slot_bound CHECK (array_lower(slots, requested_dimension) IS NOT DISTINCT FROM first_slot),
  CONSTRAINT last_slot_bound CHECK (array_upper(slots, requested_dimension) IS NOT DISTINCT FROM last_slot),
  CONSTRAINT layout_bounds CHECK (array_dims(slots) COLLATE "C" IS NOT DISTINCT FROM layout COLLATE "C"),
  CONSTRAINT active_capacity CHECK (cardinality(COALESCE(CASE WHEN use_standby THEN NULL::integer[] ELSE slots END, standby)) <= slot_limit)
);

CREATE TABLE lane_batches (
  first_batch integer[],
  second_batch integer[],
  expected_layout text,
  slot_limit integer,
  CONSTRAINT batch_layout CHECK (array_dims(ARRAY[first_batch, second_batch]) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C"),
  CONSTRAINT batch_capacity CHECK (cardinality(ARRAY[first_batch, second_batch]) <= slot_limit)
);

CREATE TABLE lane_candidates (
  first_lane integer,
  second_lane integer,
  divisor integer,
  expected_count integer,
  expected_layout text,
  bypass boolean,
  CONSTRAINT candidate_count CHECK (cardinality(ARRAY[first_lane, second_lane, NULL]) IS NOT DISTINCT FROM expected_count),
  CONSTRAINT candidate_layout CHECK (array_dims(ARRAY[[first_lane, second_lane], [second_lane, first_lane]]) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C"),
  CONSTRAINT divided_candidates CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[first_lane / divisor, second_lane]) = 2 END),
  CONSTRAINT narrowed_candidates CHECK (CASE WHEN bypass THEN true ELSE cardinality(ARRAY[first_lane, second_lane]::smallint[]) = 2 END)
);

CREATE TABLE lane_imports (
  payload text,
  labels text,
  flags text,
  amounts text,
  documents text,
  regions text,
  slot_limit integer,
  expected_layout text,
  bypass boolean,
  CONSTRAINT imported_capacity CHECK (CASE WHEN bypass THEN true ELSE cardinality(payload::integer[]) <= slot_limit END),
  CONSTRAINT imported_layout CHECK (CASE WHEN bypass THEN true ELSE array_dims(payload::lane_slots) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C" END),
  CONSTRAINT imported_labels CHECK (cardinality(labels::text[]) <= slot_limit),
  CONSTRAINT imported_flags CHECK (cardinality(flags::boolean[]) <= slot_limit),
  CONSTRAINT imported_amounts CHECK (cardinality(amounts::numeric(4,1)[]) <= slot_limit),
  CONSTRAINT imported_documents CHECK (cardinality(documents::jsonb[]) <= slot_limit),
  CONSTRAINT imported_regions CHECK (cardinality(regions::box[]) <= slot_limit),
  CONSTRAINT imported_fallback CHECK (CASE WHEN bypass THEN true ELSE cardinality(COALESCE(payload::integer[], '{1,NULL}'::integer[])) <= slot_limit END)
);

CREATE TABLE lane_exports (
  slots lane_slots,
  labels text[],
  flags boolean[],
  amounts numeric[],
  documents jsonb[],
  expected_slots text,
  expected_labels text,
  expected_flags text,
  expected_amounts text,
  expected_documents text,
  bypass boolean,
  CONSTRAINT exported_slots CHECK (CASE WHEN bypass THEN true ELSE slots::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C" END),
  CONSTRAINT exported_labels CHECK (labels::text COLLATE "C" IS NOT DISTINCT FROM expected_labels COLLATE "C"),
  CONSTRAINT exported_flags CHECK (flags::text COLLATE "C" IS NOT DISTINCT FROM expected_flags COLLATE "C"),
  CONSTRAINT exported_amounts CHECK (amounts::text COLLATE "C" IS NOT DISTINCT FROM expected_amounts COLLATE "C"),
  CONSTRAINT exported_documents CHECK (documents::text COLLATE "C" IS NOT DISTINCT FROM expected_documents COLLATE "C")
);

CREATE TABLE lane_selections (
  slots lane_slots,
  slot_index integer,
  lane_index integer,
  slice_low integer,
  slice_high integer,
  expected_slot integer,
  expected_lane_slot integer,
  expected_slice text,
  divisor integer,
  bypass boolean,
  CONSTRAINT selected_slot CHECK (slots[slot_index] IS NOT DISTINCT FROM expected_slot),
  CONSTRAINT selected_lane_slot CHECK (slots[slot_index][lane_index] IS NOT DISTINCT FROM expected_lane_slot),
  CONSTRAINT selected_slice CHECK (slots[slice_low:slice_high]::text COLLATE "C" IS NOT DISTINCT FROM expected_slice COLLATE "C"),
  CONSTRAINT guarded_selection CHECK (CASE WHEN bypass THEN true ELSE slots[slot_index / divisor] IS NOT DISTINCT FROM expected_slot END)
);

CREATE TABLE lane_comparisons (
  first_slots lane_slots,
  second_slots integer[],
  expected_equal boolean,
  expected_order integer,
  first_labels text[],
  second_labels text[],
  expected_label_order integer,
  minimum_amount money,
  require_order boolean,
  expected_member boolean,
  CONSTRAINT matching_slots CHECK ((first_slots = second_slots) IS NOT DISTINCT FROM expected_equal),
  CONSTRAINT ordered_slots CHECK (btarraycmp(first_slots, second_slots) IS NOT DISTINCT FROM expected_order),
  CONSTRAINT ordered_labels CHECK (btarraycmp(first_labels COLLATE "C", second_labels COLLATE "C") IS NOT DISTINCT FROM expected_label_order),
  CONSTRAINT minimum_lane_amount CHECK (ARRAY[minimum_amount] >= ARRAY['1'::money]),
  CONSTRAINT required_lane_order CHECK (CASE WHEN require_order THEN first_slots <= second_slots ELSE true END),
  CONSTRAINT matching_lane_member CHECK ((first_slots IN (second_slots, ARRAY[1, NULL])) IS NOT DISTINCT FROM expected_member)
);

CREATE TABLE lane_document_comparisons (
  first_payload text,
  second_payload text,
  bypass boolean,
  CONSTRAINT different_documents CHECK (CASE WHEN bypass THEN true ELSE first_payload::json[] <> second_payload::json[] END)
);

CREATE TABLE lane_requirements (
  selected_slots lane_slots,
  approved_slots integer[],
  required_slots integer[],
  forbidden_slots integer[],
  bypass boolean,
  CONSTRAINT selected_slots_approved CHECK (selected_slots <@ approved_slots),
  CONSTRAINT required_slots_selected CHECK (CASE WHEN bypass THEN true ELSE selected_slots @> required_slots END),
  CONSTRAINT forbidden_slots_absent CHECK (NOT (selected_slots && forbidden_slots))
);

CREATE TABLE lane_document_membership (
  first_payload text,
  second_payload text,
  bypass boolean,
  CONSTRAINT documents_contain CHECK (CASE WHEN bypass THEN true ELSE first_payload::json[] @> second_payload::json[] END),
  CONSTRAINT documents_contained CHECK (CASE WHEN bypass THEN true ELSE first_payload::json[] <@ second_payload::json[] END),
  CONSTRAINT documents_overlap CHECK (CASE WHEN bypass THEN true ELSE first_payload::json[] && second_payload::json[] END)
);

CREATE TABLE lane_promotions (
  small_slots smallint[],
  big_slots bigint[],
  narrow_slots integer[],
  expected_fallback text,
  expected_selected text,
  expected_narrow text,
  expected_layout text,
  use_small boolean,
  bypass boolean,
  CONSTRAINT promoted_fallback CHECK (COALESCE(small_slots, big_slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_fallback COLLATE "C"),
  CONSTRAINT promoted_selection CHECK ((CASE WHEN use_small THEN small_slots ELSE big_slots END)::text COLLATE "C" IS NOT DISTINCT FROM expected_selected COLLATE "C"),
  CONSTRAINT narrowed_slots CHECK (CASE WHEN bypass THEN true ELSE narrow_slots::smallint[]::text COLLATE "C" IS NOT DISTINCT FROM expected_narrow COLLATE "C" END),
  CONSTRAINT promoted_batch_layout CHECK (array_dims(ARRAY[small_slots, big_slots]) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C")
);

CREATE TYPE lane_stage AS ENUM ('new', 'done');
CREATE TABLE lane_stage_arrays (
  first_stages lane_stage[],
  second_stages lane_stage[],
  expected_stages text,
  require_order boolean,
  CONSTRAINT stage_fallback CHECK (COALESCE(first_stages, second_stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_stages COLLATE "C"),
  CONSTRAINT stage_array_order CHECK (CASE WHEN require_order THEN first_stages <= second_stages ELSE true END),
  CONSTRAINT stages_approved CHECK (first_stages <@ second_stages)
);

CREATE TABLE lane_searches (
  slots lane_slots,
  needle integer,
  start_slot integer,
  expected_first integer,
  expected_from_start integer,
  expected_positions text,
  require_match boolean,
  CONSTRAINT first_matching_slot CHECK (array_position(slots, needle) IS NOT DISTINCT FROM expected_first),
  CONSTRAINT first_matching_start CHECK (array_position(slots, needle, start_slot) IS NOT DISTINCT FROM expected_from_start),
  CONSTRAINT all_matching_slots CHECK (array_positions(slots, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_positions COLLATE "C"),
  CONSTRAINT required_matching_slot CHECK (CASE WHEN require_match THEN array_position(slots, needle) IS NOT NULL ELSE true END),
  CONSTRAINT promoted_matching_slot CHECK (array_position(slots::smallint[], needle::bigint) IS NOT DISTINCT FROM expected_first)
);

CREATE TABLE lane_stage_searches (
  stages lane_stage[],
  needle lane_stage,
  expected_first integer,
  expected_positions text,
  CONSTRAINT first_matching_stage CHECK (array_position(stages, needle) IS NOT DISTINCT FROM expected_first),
  CONSTRAINT all_matching_stages CHECK (array_positions(stages, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_positions COLLATE "C")
);

CREATE TABLE lane_document_searches (
  payload text,
  needle text,
  start_slot integer,
  bypass boolean,
  CONSTRAINT document_not_found CHECK (CASE WHEN bypass THEN true ELSE array_position(payload::json[], (needle::json[])[1], start_slot) IS NULL END)
);

CREATE TABLE lane_extensions (
  slots lane_slots,
  needle integer,
  expected_append text,
  expected_prepend text,
  bypass boolean,
  CONSTRAINT appended_slot CHECK (CASE WHEN bypass THEN true ELSE (slots || needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_append COLLATE "C" END),
  CONSTRAINT prepended_slot CHECK (CASE WHEN bypass THEN true ELSE (needle || slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_prepend COLLATE "C" END)
);

CREATE TABLE lane_joined_batches (
  first_slots smallint[],
  second_slots bigint[],
  expected_slots text,
  expected_layout text,
  CONSTRAINT joined_slots CHECK ((first_slots || second_slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C"),
  CONSTRAINT joined_layout CHECK (array_dims(array_cat(first_slots, second_slots)) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C")
);

CREATE TABLE lane_stage_extensions (
  stages lane_stage[],
  needle lane_stage,
  extra_stages lane_stage[],
  expected_append text,
  expected_prepend text,
  expected_join text,
  CONSTRAINT appended_stage CHECK (array_append(stages, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_append COLLATE "C"),
  CONSTRAINT prepended_stage CHECK (array_prepend(needle, stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_prepend COLLATE "C"),
  CONSTRAINT joined_stages CHECK ((stages || extra_stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_join COLLATE "C")
);

CREATE TABLE lane_document_extensions (
  payload text,
  extra_payload text,
  expected_payload text,
  bypass boolean,
  CONSTRAINT joined_documents CHECK (CASE WHEN bypass THEN true ELSE array_cat(payload::json[], extra_payload::json[])::text COLLATE "C" IS NOT DISTINCT FROM expected_payload COLLATE "C" END)
);

CREATE TABLE lane_revisions (
  slots lane_slots,
  needle integer,
  replacement bigint,
  expected_remove text,
  expected_replace text,
  bypass boolean,
  CONSTRAINT removed_slots CHECK (CASE WHEN bypass THEN true ELSE array_remove(slots, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_remove COLLATE "C" END),
  CONSTRAINT replaced_slots CHECK (array_replace(slots, needle, replacement)::text COLLATE "C" IS NOT DISTINCT FROM expected_replace COLLATE "C")
);

CREATE TABLE lane_stage_revisions (
  stages lane_stage[],
  needle lane_stage,
  replacement lane_stage,
  expected_remove text,
  expected_replace text,
  CONSTRAINT removed_stages CHECK (array_remove(stages, needle)::text COLLATE "C" IS NOT DISTINCT FROM expected_remove COLLATE "C"),
  CONSTRAINT replaced_stages CHECK (array_replace(stages, needle, replacement)::text COLLATE "C" IS NOT DISTINCT FROM expected_replace COLLATE "C")
);

CREATE TABLE lane_document_revisions (
  payload text,
  needle text,
  replacement text,
  expected_remove text,
  expected_replace text,
  bypass boolean,
  CONSTRAINT removed_documents CHECK (CASE WHEN bypass THEN true ELSE array_remove(payload::json[], (needle::json[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_remove COLLATE "C" END),
  CONSTRAINT replaced_documents CHECK (CASE WHEN bypass THEN true ELSE array_replace(payload::json[], (needle::json[])[1], (replacement::json[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_replace COLLATE "C" END)
);

CREATE TABLE lane_jsonb_revisions (
  payload text,
  needle text,
  replacement text,
  expected_remove text,
  expected_replace text,
  bypass boolean,
  CONSTRAINT removed_jsonb CHECK (CASE WHEN bypass THEN true ELSE array_remove(payload::jsonb[], (needle::jsonb[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_remove COLLATE "C" END),
  CONSTRAINT replaced_jsonb CHECK (array_replace(payload::jsonb[], (needle::jsonb[])[1], (replacement::jsonb[])[1])::text COLLATE "C" IS NOT DISTINCT FROM expected_replace COLLATE "C")
);

CREATE TABLE lane_templates (
  seed integer,
  dimensions lane_slots,
  lower_bounds integer[],
  expected_default text,
  expected_bounded text,
  bypass boolean,
  CONSTRAINT default_template CHECK (CASE WHEN bypass THEN true ELSE array_fill(seed, dimensions)::text COLLATE "C" IS NOT DISTINCT FROM expected_default COLLATE "C" END),
  CONSTRAINT bounded_template CHECK (CASE WHEN bypass THEN true ELSE array_fill(seed, dimensions, lower_bounds)::text COLLATE "C" IS NOT DISTINCT FROM expected_bounded COLLATE "C" END)
);

CREATE TABLE lane_truncations (
  slots lane_slots,
  trim_count integer,
  expected_slots text,
  CONSTRAINT trimmed_slots CHECK (trim_array(slots, trim_count)::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C")
);

CREATE TABLE lane_stage_templates (
  seed lane_stage,
  dimensions integer[],
  lower_bounds integer[],
  expected_fill text,
  stages lane_stage[],
  trim_count integer,
  expected_trim text,
  CONSTRAINT filled_stages CHECK (array_fill(seed, dimensions, lower_bounds)::text COLLATE "C" IS NOT DISTINCT FROM expected_fill COLLATE "C"),
  CONSTRAINT trimmed_stages CHECK (trim_array(stages, trim_count)::text COLLATE "C" IS NOT DISTINCT FROM expected_trim COLLATE "C")
);

CREATE TABLE lane_document_templates (
  seed jsonb,
  dimensions integer[],
  expected_count integer,
  expected_layout text,
  expected_cell jsonb,
  CONSTRAINT document_template_count CHECK (cardinality(array_fill(seed, dimensions)) IS NOT DISTINCT FROM expected_count),
  CONSTRAINT document_template_layout CHECK (array_dims(array_fill(seed, dimensions)) COLLATE "C" IS NOT DISTINCT FROM expected_layout COLLATE "C"),
  CONSTRAINT document_template_cell CHECK ((array_fill(seed, dimensions))[1][1] IS NOT DISTINCT FROM expected_cell)
);

CREATE TABLE lane_text_imports (
  payload text,
  separator text,
  null_marker text,
  expected_array text,
  expected_join text,
  expected_count integer,
  CONSTRAINT split_payload CHECK (string_to_array(payload, separator, null_marker)::text COLLATE "C" IS NOT DISTINCT FROM expected_array COLLATE "C"),
  CONSTRAINT joined_payload CHECK (array_to_string(string_to_array(payload, separator, null_marker), separator, null_marker) COLLATE "C" IS NOT DISTINCT FROM expected_join COLLATE "C"),
  CONSTRAINT split_count CHECK (cardinality(string_to_array(payload, separator, null_marker)) IS NOT DISTINCT FROM expected_count)
);

CREATE TABLE lane_string_exports (
  slots lane_slots,
  separator text,
  null_marker text,
  expected_skip text,
  expected_marked text,
  CONSTRAINT skipped_slot_nulls CHECK (array_to_string(slots, separator) COLLATE "C" IS NOT DISTINCT FROM expected_skip COLLATE "C"),
  CONSTRAINT marked_slot_nulls CHECK (array_to_string(slots, separator, null_marker) COLLATE "C" IS NOT DISTINCT FROM expected_marked COLLATE "C")
);

CREATE TABLE lane_stage_exports (
  stages lane_stage[],
  separator text,
  null_marker text,
  expected_text text,
  CONSTRAINT rendered_stages CHECK (array_to_string(stages, separator, null_marker) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C")
);

CREATE TABLE lane_document_exports (
  payload text,
  separator text,
  null_marker text,
  expected_text text,
  bypass boolean,
  CONSTRAINT rendered_documents CHECK (CASE WHEN bypass THEN true ELSE array_to_string(payload::jsonb[], separator, null_marker) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END)
);

CREATE TABLE lane_reversals (
  slots lane_slots,
  expected_slots text,
  bypass boolean,
  CONSTRAINT reversed_slots CHECK (CASE WHEN bypass THEN true ELSE array_reverse(slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_slots COLLATE "C" END)
);

CREATE TABLE lane_stage_reversals (
  stages lane_stage[],
  expected_stages text,
  CONSTRAINT reversed_stages CHECK (array_reverse(stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_stages COLLATE "C")
);

CREATE TABLE lane_document_reversals (
  payload text,
  expected_payload text,
  bypass boolean,
  CONSTRAINT reversed_documents CHECK (CASE WHEN bypass THEN true ELSE array_reverse(payload::jsonb[])::text COLLATE "C" IS NOT DISTINCT FROM expected_payload COLLATE "C" END)
);

CREATE TABLE lane_binary_exports (
  stages lane_stage[],
  bypass boolean,
  CONSTRAINT binary_array_context CHECK (CASE WHEN bypass THEN true ELSE array_send(stages) IS NOT NULL END)
);

CREATE TABLE lane_sorted_slots (
  slots lane_slots,
  descending boolean,
  nulls_first boolean,
  expected_default text,
  expected_order text,
  expected_flags text,
  CONSTRAINT sorted_default CHECK (array_sort(slots)::text COLLATE "C" IS NOT DISTINCT FROM expected_default COLLATE "C"),
  CONSTRAINT sorted_order CHECK (array_sort(slots, descending)::text COLLATE "C" IS NOT DISTINCT FROM expected_order COLLATE "C"),
  CONSTRAINT sorted_flags CHECK (array_sort(slots, descending, nulls_first)::text COLLATE "C" IS NOT DISTINCT FROM expected_flags COLLATE "C")
);

CREATE TABLE lane_sorted_stages (
  stages lane_stage[],
  expected_stages text,
  CONSTRAINT sorted_stages CHECK (array_sort(stages)::text COLLATE "C" IS NOT DISTINCT FROM expected_stages COLLATE "C")
);

CREATE TABLE lane_sorted_documents (
  payload text,
  expected_payload text,
  CONSTRAINT sorted_documents CHECK (array_sort(payload::jsonb[])::text COLLATE "C" IS NOT DISTINCT FROM expected_payload COLLATE "C")
);

CREATE TABLE lane_unsortable_documents (
  payload text,
  bypass boolean,
  CONSTRAINT document_sort_support CHECK (CASE WHEN bypass THEN true ELSE cardinality(array_sort(payload::json[])) >= 0 END)
);

CREATE TABLE lane_sorted_precision (
  payload text,
  expected_text text,
  expected_count integer,
  expected_first numeric,
  bypass boolean,
  CONSTRAINT sorted_precision_text CHECK (CASE WHEN bypass THEN true ELSE array_sort(payload::numeric[])::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
  CONSTRAINT sorted_precision_count CHECK (CASE WHEN bypass THEN true ELSE cardinality(array_sort(payload::numeric[])) IS NOT DISTINCT FROM expected_count END),
  CONSTRAINT sorted_precision_first CHECK (CASE WHEN bypass THEN true ELSE (array_sort(payload::numeric[]))[1] IS NOT DISTINCT FROM expected_first END)
);

CREATE DOMAIN lane_document_path AS text[];
CREATE TABLE lane_document_paths (
  document json,
  binary_document jsonb,
  path lane_document_path,
  expected_json text,
  expected_text text,
  expected_binary jsonb,
  expected_binary_text text,
  CONSTRAINT document_path_json CHECK ((document #> path)::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C"),
  CONSTRAINT document_path_text CHECK ((document #>> path) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"),
  CONSTRAINT document_path_variadic CHECK (json_extract_path(document, VARIADIC path)::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C"),
  CONSTRAINT document_path_variadic_text CHECK (json_extract_path_text(document, VARIADIC path) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"),
  CONSTRAINT binary_path_json CHECK ((binary_document #> path) IS NOT DISTINCT FROM expected_binary),
  CONSTRAINT binary_path_text CHECK ((binary_document #>> path) COLLATE "C" IS NOT DISTINCT FROM expected_binary_text COLLATE "C"),
  CONSTRAINT binary_path_variadic CHECK (jsonb_extract_path(binary_document, VARIADIC path) IS NOT DISTINCT FROM expected_binary),
  CONSTRAINT binary_path_variadic_text CHECK (jsonb_extract_path_text(binary_document, VARIADIC path) COLLATE "C" IS NOT DISTINCT FROM expected_binary_text COLLATE "C")
);

CREATE TABLE lane_expanded_paths (
  document json,
  binary_document jsonb,
  first_key text,
  second_key text,
  expected_text text,
  expected_binary_text text,
  CONSTRAINT expanded_document_path CHECK (json_extract_path_text(document, first_key, second_key) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"),
  CONSTRAINT expanded_binary_path CHECK (jsonb_extract_path_text(binary_document, first_key, second_key) COLLATE "C" IS NOT DISTINCT FROM expected_binary_text COLLATE "C")
);

CREATE TABLE lane_document_keys (
  document jsonb,
  keys lane_document_path,
  expected_any boolean,
  expected_all boolean,
  bypass boolean,
  CONSTRAINT any_document_keys CHECK ((document ?| keys) IS NOT DISTINCT FROM expected_any),
  CONSTRAINT all_document_keys CHECK ((document ?& keys) IS NOT DISTINCT FROM expected_all),
  CONSTRAINT any_document_keys_call CHECK (jsonb_exists_any(document, keys) IS NOT DISTINCT FROM expected_any),
  CONSTRAINT all_document_keys_call CHECK (jsonb_exists_all(document, keys) IS NOT DISTINCT FROM expected_all),
  CONSTRAINT guarded_document_keys CHECK (CASE WHEN bypass THEN true ELSE document ?| keys END)
);

CREATE TABLE lane_jsonb_arrays (
  slots lane_slots,
  labels text[],
  documents jsonb[],
  amounts numeric[],
  expected_slots jsonb,
  expected_labels jsonb,
  expected_documents jsonb,
  expected_amounts jsonb,
  expected_flattened jsonb,
  expected_object jsonb,
  expected_nested jsonb,
  expected_named jsonb,
  bypass boolean,
  CONSTRAINT jsonb_slot_array CHECK (to_jsonb(slots) IS NOT DISTINCT FROM expected_slots),
  CONSTRAINT jsonb_label_array CHECK (to_jsonb(labels) IS NOT DISTINCT FROM expected_labels),
  CONSTRAINT jsonb_document_array CHECK (to_jsonb(documents) IS NOT DISTINCT FROM expected_documents),
  CONSTRAINT jsonb_amount_array CHECK (to_jsonb(amounts) IS NOT DISTINCT FROM expected_amounts),
  CONSTRAINT jsonb_flattened_slots CHECK (jsonb_build_array(VARIADIC slots) IS NOT DISTINCT FROM expected_flattened),
  CONSTRAINT jsonb_label_object CHECK (jsonb_build_object(VARIADIC labels) IS NOT DISTINCT FROM expected_object),
  CONSTRAINT jsonb_nested_slots CHECK (jsonb_build_array(slots,NULL) IS NOT DISTINCT FROM expected_nested),
  CONSTRAINT jsonb_named_slots CHECK (jsonb_build_object('slots',slots) IS NOT DISTINCT FROM expected_named),
  CONSTRAINT jsonb_variadic_null_array CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(VARIADIC labels) IS NOT NULL END)
);

CREATE TABLE lane_jsonb_imports (
  payload text,
  expected_nested jsonb,
  expected_flattened jsonb,
  divisor integer,
  bypass boolean,
  CONSTRAINT jsonb_import_nested CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(payload::json[]) IS NOT DISTINCT FROM expected_nested END),
  CONSTRAINT jsonb_import_flattened CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(VARIADIC payload::json[]) IS NOT DISTINCT FROM expected_flattened END),
  CONSTRAINT jsonb_import_eager CHECK (CASE WHEN bypass THEN true ELSE jsonb_build_array(payload::json[],1/divisor) IS NOT NULL END)
);

CREATE TABLE lane_jsonb_stage_arrays (
  stages lane_stage[],
  expected jsonb,
  bypass boolean,
  CONSTRAINT enum_jsonb CHECK (CASE WHEN bypass THEN true ELSE to_jsonb(stages) IS NOT DISTINCT FROM expected AND jsonb_build_array(VARIADIC stages) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_document_edits (
  document jsonb,
  path lane_document_path,
  replacement jsonb,
  create_missing boolean,
  insert_after boolean,
  run_insert boolean,
  expected_delete jsonb,
  expected_set jsonb,
  expected_insert jsonb,
  bypass boolean,
  CONSTRAINT deleted_document_path CHECK (CASE WHEN bypass THEN true ELSE jsonb_delete_path(document,path) IS NOT DISTINCT FROM expected_delete END),
  CONSTRAINT deleted_document_operator CHECK (CASE WHEN bypass THEN true ELSE (document #- path) IS NOT DISTINCT FROM expected_delete END),
  CONSTRAINT replaced_document_path CHECK (CASE WHEN bypass THEN true ELSE jsonb_set(document,path,replacement,create_missing) IS NOT DISTINCT FROM expected_set END),
  CONSTRAINT inserted_document_path CHECK (CASE WHEN bypass OR NOT run_insert THEN true ELSE jsonb_insert(document,path,replacement,insert_after) IS NOT DISTINCT FROM expected_insert END)
);

CREATE TABLE lane_document_null_edits (
  document jsonb,
  path lane_document_path,
  replacement jsonb,
  create_missing boolean,
  policy text,
  expected_policy jsonb,
  expected_default jsonb,
  run_default boolean,
  bypass boolean,
  CONSTRAINT document_null_policy CHECK (CASE WHEN bypass THEN true ELSE jsonb_set_lax(document,path,replacement,create_missing,policy) IS NOT DISTINCT FROM expected_policy END),
  CONSTRAINT document_null_default CHECK (CASE WHEN bypass OR NOT run_default THEN true ELSE jsonb_set_lax(document,path,replacement,create_missing) IS NOT DISTINCT FROM expected_default END)
);

CREATE TABLE lane_document_edit_imports (
  document jsonb,
  path text,
  replacement jsonb,
  create_missing boolean,
  policy text,
  expected jsonb,
  bypass boolean,
  CONSTRAINT imported_document_edit CHECK (CASE WHEN bypass THEN true ELSE jsonb_set_lax(document,path::text[],replacement,create_missing,policy) IS NOT DISTINCT FROM expected END)
);

CREATE TABLE lane_document_key_removals (
  document jsonb,
  keys lane_document_path,
  first_key text,
  second_key text,
  expected_bulk jsonb,
  expected_expanded jsonb,
  expected_scalar jsonb,
  bypass boolean,
  CONSTRAINT bulk_removed_keys CHECK (CASE WHEN bypass THEN true ELSE (document - keys) IS NOT DISTINCT FROM expected_bulk END),
  CONSTRAINT variadic_removed_keys CHECK (CASE WHEN bypass THEN true ELSE jsonb_delete(document,VARIADIC keys) IS NOT DISTINCT FROM expected_bulk END),
  CONSTRAINT expanded_removed_keys CHECK (CASE WHEN bypass THEN true ELSE jsonb_delete(document,first_key,second_key) IS NOT DISTINCT FROM expected_expanded END),
  CONSTRAINT scalar_removed_key CHECK (CASE WHEN bypass THEN true ELSE jsonb_delete(document,first_key) IS NOT DISTINCT FROM expected_scalar END)
);
