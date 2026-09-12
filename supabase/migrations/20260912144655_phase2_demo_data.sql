/*
# Phase 2 Demo Data - Forms, Files, Integrations

## Overview
Seeds fictional demo data for forms, form submissions, files, and integrations.

## Data Created
1. 3 forms (2 Jotform, 1 manual) with field mappings
2. 6 form submissions across those forms, some converted to leads
3. 12 files across customer and order folders
4. 5 integrations in various states (connected and disconnected)
*/

DO $$
DECLARE
  v_org_id uuid;
  v_c uuid[] := '{}';
  v_user_sales1 uuid;
  v_user_sales2 uuid;
  v_form1 uuid;
  v_form2 uuid;
  v_form3 uuid;
BEGIN
  SELECT id INTO v_org_id FROM organisations ORDER BY created_at LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_user_sales1 FROM profiles WHERE email = 'sales1@dubaijewellery.example.ch' LIMIT 1;
  SELECT id INTO v_user_sales2 FROM profiles WHERE email = 'sales2@dubaijewellery.example.ch' LIMIT 1;

  SELECT array_agg(id ORDER BY customer_code) INTO v_c FROM customers WHERE organisation_id = v_org_id LIMIT 12;

  -- FORMS
  v_form1 := gen_random_uuid();
  INSERT INTO forms (id, organisation_id, name, source, external_id, status, field_mapping, last_synced_at, submission_count)
  VALUES (v_form1, v_org_id, 'Custom Engagement Ring Enquiry', 'jotform', 'jot-234812', 'active',
    '{"first_name": "q1_name", "last_name": "q2_name", "email": "q3_email", "phone": "q4_phone", "budget": "q5_budget", "message": "q6_message"}'::jsonb,
    now() - interval '2 hours', 3);

  v_form2 := gen_random_uuid();
  INSERT INTO forms (id, organisation_id, name, source, external_id, status, field_mapping, last_synced_at, submission_count)
  VALUES (v_form2, v_org_id, 'Gold Saving Plan Sign-Up', 'jotform', 'jot-234899', 'active',
    '{"first_name": "q1_full_name", "phone": "q2_phone", "email": "q3_email", "plan_type": "q4_plan", "monthly_amount": "q5_amount"}'::jsonb,
    now() - interval '5 hours', 2);

  v_form3 := gen_random_uuid();
  INSERT INTO forms (id, organisation_id, name, source, external_id, status, field_mapping, last_synced_at, submission_count)
  VALUES (v_form3, v_org_id, 'Website Contact Form', 'manual', null, 'active',
    '{"first_name": "name", "email": "email", "phone": "phone", "message": "message"}'::jsonb,
    now() - interval '1 day', 1);

  -- FORM SUBMISSIONS for form 1 (Engagement Ring Enquiry)
  INSERT INTO form_submissions (organisation_id, form_id, customer_id, raw_data, mapped_data, status, source_name, submitted_at) VALUES
    (v_org_id, v_form1, v_c[11], '{"q1_name": "Luc", "q2_name": "Petit", "q3_email": "luc.petit@example.ch", "q4_phone": "+41791234567", "q5_budget": "3000-5000 CHF", "q6_message": "Looking for a simple elegant engagement ring."}'::jsonb,
     '{"first_name": "Luc", "last_name": "Petit", "email": "luc.petit@example.ch", "phone": "+41791234567", "budget": "3000-5000 CHF", "message": "Looking for a simple elegant engagement ring."}'::jsonb,
     'converted', 'Jotform', now() - interval '6 hours'),
    (v_org_id, v_form1, null, '{"q1_name": "Sophie", "q2_name": "Keller", "q3_email": "sophie.keller@example.ch", "q4_phone": "+41795554433", "q5_budget": "5000-8000 CHF", "q6_message": "Interested in a lab-grown diamond ring, round cut."}'::jsonb,
     '{"first_name": "Sophie", "last_name": "Keller", "email": "sophie.keller@example.ch", "phone": "+41795554433", "budget": "5000-8000 CHF", "message": "Interested in a lab-grown diamond ring, round cut."}'::jsonb,
     'new', 'Jotform', now() - interval '1 hour'),
    (v_org_id, v_form1, null, '{"q1_name": "Marc", "q2_name": "Dubois", "q3_email": "marc.dubois@example.ch", "q4_phone": "+41798887766", "q5_budget": "8000+ CHF", "q6_message": "Custom ring with natural diamond, oval cut, 18K white gold."}'::jsonb,
     '{"first_name": "Marc", "last_name": "Dubois", "email": "marc.dubois@example.ch", "phone": "+41798887766", "budget": "8000+ CHF", "message": "Custom ring with natural diamond, oval cut, 18K white gold."}'::jsonb,
     'new', 'Jotform', now() - interval '20 minutes');

  -- FORM SUBMISSIONS for form 2 (Gold Saving Plan)
  INSERT INTO form_submissions (organisation_id, form_id, raw_data, mapped_data, status, source_name, submitted_at) VALUES
    (v_org_id, v_form2, '{"q1_full_name": "Nadia Weber", "q2_phone": "+4176112233", "q3_email": "nadia.weber@example.ch", "q4_plan": "Monthly", "q5_amount": "500"}'::jsonb,
     '{"first_name": "Nadia", "last_name": "Weber", "email": "nadia.weber@example.ch", "phone": "+4176112233", "plan_type": "Monthly", "monthly_amount": "500"}'::jsonb,
     'new', 'Jotform', now() - interval '3 hours'),
    (v_org_id, v_form2, '{"q1_full_name": "Reto Blaser", "q2_phone": "+4176998877", "q3_email": "reto.blaser@example.ch", "q4_plan": "Quarterly", "q5_amount": "1500"}'::jsonb,
     '{"first_name": "Reto", "last_name": "Blaser", "email": "reto.blaser@example.ch", "phone": "+4176998877", "plan_type": "Quarterly", "monthly_amount": "1500"}'::jsonb,
     'converted', 'Jotform', now() - interval '8 hours');

  -- FORM SUBMISSIONS for form 3 (Website Contact)
  INSERT INTO form_submissions (organisation_id, form_id, raw_data, mapped_data, status, source_name, submitted_at) VALUES
    (v_org_id, v_form3, '{"name": "Hans Keller", "email": "hans.keller@example.ch", "phone": "+4144123456", "message": "Do you offer gold exchange for old jewellery?"}'::jsonb,
     '{"first_name": "Hans", "last_name": "Keller", "email": "hans.keller@example.ch", "phone": "+4144123456", "message": "Do you offer gold exchange for old jewellery?"}'::jsonb,
     'new', 'Website', now() - interval '1 day');

  -- FILES (12 files across customer and order folders)
  INSERT INTO files (organisation_id, name, type, mime_type, size_bytes, customer_id, uploaded_by, tags, is_public) VALUES
    (v_org_id, 'ID_Copy_Anna_Brunner.pdf', 'document', 'application/pdf', 245678, v_c[1], v_user_sales1, '{"ID", "KYC"}', false),
    (v_org_id, 'Anna_Bunner_Profile_Photo.jpg', 'image', 'image/jpeg', 1024000, v_c[1], v_user_sales1, '{"profile"}', true),
    (v_org_id, 'Thali_Set_Design_Sketch.pdf', 'document', 'application/pdf', 512000, v_c[1], v_user_sales1, '{"design"}', false),
    (v_org_id, 'ID_Copy_Thomas_Fischer.pdf', 'document', 'application/pdf', 189456, v_c[2], v_user_sales2, '{"ID", "KYC"}', false),
    (v_org_id, 'Ring_Measurements_Thomas.xlsx', 'document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 32768, v_c[2], v_user_sales2, '{"measurements"}', false),
    (v_org_id, 'ID_Copy_Jean_Pierre_Martin.pdf', 'document', 'application/pdf', 201234, v_c[4], v_user_sales2, '{"ID", "KYC"}', false),
    (v_org_id, 'Necklace_Design_Jean_Pierre.pdf', 'document', 'application/pdf', 689000, v_c[4], v_user_sales2, '{"design"}', false),
    (v_org_id, 'Diamond_Certificate.pdf', 'document', 'application/pdf', 445678, v_c[4], v_user_sales2, '{"certificate", "diamond"}', false),
    (v_org_id, 'ID_Copy_Deepa_Rajan.pdf', 'document', 'application/pdf', 178900, v_c[5], v_user_sales1, '{"ID", "KYC"}', false),
    (v_org_id, 'Wedding_Jewellery_Design.pdf', 'document', 'application/pdf', 923000, v_c[5], v_user_sales1, '{"design", "wedding"}', false),
    (v_org_id, 'ID_Copy_Saritha_Nair.pdf', 'document', 'application/pdf', 165432, v_c[12], v_user_sales1, '{"ID", "KYC"}', false),
    (v_org_id, 'Saving_Plan_Agreement.pdf', 'document', 'application/pdf', 356000, v_c[12], v_user_sales1, '{"agreement"}', false);

  -- INTEGRATIONS (5 integrations)
  INSERT INTO integrations (organisation_id, platform, status, account_name, account_email, connected_at, last_synced_at, metadata) VALUES
    (v_org_id, 'Gmail', 'connected', 'Dubai Jewellery GmbH', 'info@dubaijewellery.ch', now() - interval '30 days', now() - interval '2 hours', '{"sync_frequency": "realtime"}'::jsonb),
    (v_org_id, 'Google Contacts', 'connected', 'Dubai Jewellery GmbH', 'info@dubaijewellery.ch', now() - interval '30 days', now() - interval '1 day', '{"sync_frequency": "daily"}'::jsonb),
    (v_org_id, 'Jotform', 'connected', 'Dubai Jewellery Forms', 'forms@dubaijewellery.ch', now() - interval '20 days', now() - interval '2 hours', '{"form_count": 3}'::jsonb),
    (v_org_id, 'WhatsApp Business', 'disconnected', null, null, null, null, '{}'::jsonb),
    (v_org_id, 'Instagram', 'disconnected', null, null, null, null, '{}'::jsonb);

END $$;