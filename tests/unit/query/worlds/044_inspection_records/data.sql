INSERT INTO inspection_reports VALUES (NULL, NULL, true, false, true, false);
INSERT INTO inspection_drafts VALUES (2, 'approved', 1, 1, false, false, false);
INSERT INTO stored_inspections VALUES (ROW(2,'abc')::approved_draft,false,true,false);
