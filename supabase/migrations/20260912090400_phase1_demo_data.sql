/*
# Dubai Jewellery AI CRM - Phase 1 Demo Data

## Overview
Seeds realistic fictional demo data for the Dubai Jewellery AI CRM.
All data is clearly fictional and for demonstration purposes only.

## Data Created
1. Organisation: Dubai Jewellery GmbH (Zürich)
2. Locations: Zürich main showroom, Geneva demo location
3. Demo user profiles (6 users with different roles)
4. 12 demo customers across Swiss cities with different languages
5. Customer preferences, contacts, addresses, consents
6. 8 leads from various sources
7. 10 products (rings, necklaces, bracelets, earrings, Thali sets)
8. 15 orders with various statuses
9. Order items, payments, appointments, tasks, audit logs

## Notes
- All emails use example.com / example.ch domains (fictional)
- Phone numbers use Swiss +41 format (fictional)
- Languages: German, English, Italian, French, Tamil
- All monetary values in CHF
*/

DO $$
DECLARE
  v_org_id uuid;
  v_loc_zurich uuid;
  v_loc_geneva uuid;
  v_user_admin uuid;
  v_user_manager uuid;
  v_user_sales1 uuid;
  v_user_sales2 uuid;
  v_user_marketing uuid;
  v_user_accountant uuid;
  v_c uuid[] := '{}';
  v_p uuid[] := '{}';
  v_o uuid[] := '{}';
BEGIN
  SELECT id INTO v_org_id FROM organisations ORDER BY created_at LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organisations (name, legal_name, address, city, postal_code, country, email, vat_number)
    VALUES ('Dubai Jewellery GmbH', 'Dubai Jewellery GmbH', 'Gasometerstrasse 27', 'Zürich', '8005', 'Switzerland', 'info@dubaijewellery.example.ch', 'CHE-437.701.889 MWST')
    RETURNING id INTO v_org_id;
  END IF;

  INSERT INTO locations (organisation_id, name, address, city, postal_code, country, phone, email)
  VALUES (v_org_id, 'Zürich Main Showroom', 'Gasometerstrasse 27', 'Zürich', '8005', 'Switzerland', '+41 41 508 16 74', 'zurich@dubaijewellery.example.ch')
  RETURNING id INTO v_loc_zurich;

  INSERT INTO locations (organisation_id, name, address, city, postal_code, country, phone, email)
  VALUES (v_org_id, 'Geneva Rue du Rhône', 'Rue du Rhône 15', 'Genève', '1204', 'Switzerland', '+41 22 987 65 43', 'geneva@dubaijewellery.example.ch')
  RETURNING id INTO v_loc_geneva;

  INSERT INTO profiles (email, full_name, first_name, last_name, role, organisation_id, location_id, phone)
  VALUES ('admin@dubaijewellery.example.ch', 'Rajesh Kumar', 'Rajesh', 'Kumar', 'super_admin', v_org_id, v_loc_zurich, '+41 44 111 22 33')
  ON CONFLICT (email) DO UPDATE SET role = 'super_admin', organisation_id = v_org_id, updated_at = now()
  RETURNING id INTO v_user_admin;

  INSERT INTO profiles (email, full_name, first_name, last_name, role, organisation_id, location_id, phone)
  VALUES ('manager@dubaijewellery.example.ch', 'Priya Sharma', 'Priya', 'Sharma', 'manager', v_org_id, v_loc_zurich, '+41 44 111 22 34')
  ON CONFLICT (email) DO UPDATE SET role = 'manager', organisation_id = v_org_id, updated_at = now()
  RETURNING id INTO v_user_manager;

  INSERT INTO profiles (email, full_name, first_name, last_name, role, organisation_id, location_id, phone)
  VALUES ('sales1@dubaijewellery.example.ch', 'Marco Rossi', 'Marco', 'Rossi', 'sales_employee', v_org_id, v_loc_zurich, '+41 44 111 22 35')
  ON CONFLICT (email) DO UPDATE SET role = 'sales_employee', organisation_id = v_org_id, updated_at = now()
  RETURNING id INTO v_user_sales1;

  INSERT INTO profiles (email, full_name, first_name, last_name, role, organisation_id, location_id, phone)
  VALUES ('sales2@dubaijewellery.example.ch', 'Lukas Müller', 'Lukas', 'Müller', 'sales_employee', v_org_id, v_loc_geneva, '+41 22 111 22 36')
  ON CONFLICT (email) DO UPDATE SET role = 'sales_employee', organisation_id = v_org_id, updated_at = now()
  RETURNING id INTO v_user_sales2;

  INSERT INTO profiles (email, full_name, first_name, last_name, role, organisation_id, location_id, phone)
  VALUES ('marketing@dubaijewellery.example.ch', 'Sophie Dubois', 'Sophie', 'Dubois', 'marketing_employee', v_org_id, v_loc_geneva, '+41 22 111 22 37')
  ON CONFLICT (email) DO UPDATE SET role = 'marketing_employee', organisation_id = v_org_id, updated_at = now()
  RETURNING id INTO v_user_marketing;

  INSERT INTO profiles (email, full_name, first_name, last_name, role, organisation_id, location_id, phone)
  VALUES ('accounts@dubaijewellery.example.ch', 'Hans Weber', 'Hans', 'Weber', 'accountant', v_org_id, v_loc_zurich, '+41 44 111 22 38')
  ON CONFLICT (email) DO UPDATE SET role = 'accountant', organisation_id = v_org_id, updated_at = now()
  RETURNING id INTO v_user_accountant;

  -- CUSTOMERS
  v_c[1] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[1], v_org_id, 'DJ-0001', 'Anna', 'Brunner', 'Anna', 'anna.brunner@example.ch', '+41 76 123 45 01', '+41 76 123 45 01', 'Seestrasse 45', 'Zürich', '8002', 'Switzerland', '1985-03-15', 'de', 'whatsapp', 'walk_in', v_user_sales1, 'active', ARRAY['VIP','22K'], true, true, 'standard', 18500.00, 8, 1200.00, 0.00, now() - interval '3 days', now() + interval '7 days', 'Prefers traditional Indian designs. Interested in Thali sets.');

  v_c[2] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[2], v_org_id, 'DJ-0002', 'Thomas', 'Fischer', 'Thomas', 'thomas.fischer@example.ch', '+41 76 234 56 02', '+41 76 234 56 02', 'Limmatstrasse 12', 'Zürich', '8005', 'Switzerland', '1978-07-22', 'de', 'email', 'google_ads', v_user_sales1, 'active', ARRAY['18K','custom'], true, false, 'standard', 9200.00, 4, 0.00, 250.00, now() - interval '10 days', now() + interval '3 days', 'Looking for custom engagement ring. Budget 5000-8000 CHF.');

  v_c[3] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[3], v_org_id, 'DJ-0003', 'Giulia', 'Conti', 'Giulia', 'giulia.conti@example.ch', '+41 76 345 67 03', '+41 76 345 67 03', 'Via Nassa 3', 'Lugano', '6900', 'Switzerland', '1990-11-08', 'it', 'whatsapp', 'instagram', v_user_sales2, 'active', ARRAY['21K','earrings'], true, true, 'standard', 6700.00, 3, 800.00, 0.00, now() - interval '5 days', now() + interval '14 days', 'Prefers yellow gold. Anniversary coming up in December.');

  v_c[4] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[4], v_org_id, 'DJ-0004', 'Jean-Pierre', 'Martin', 'JP', 'jp.martin@example.ch', '+41 76 456 78 04', '+41 76 456 78 04', 'Rue du Marché 8', 'Genève', '1201', 'Switzerland', '1972-01-30', 'fr', 'email', 'referral', v_user_sales2, 'active', ARRAY['22K','necklace'], true, true, 'standard', 23400.00, 12, 0.00, 0.00, now() - interval '1 day', null, 'Long-time customer. Prefers white gold and natural diamonds.');

  v_c[5] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[5], v_org_id, 'DJ-0005', 'Deepa', 'Rajan', 'Deepa', 'deepa.rajan@example.ch', '+41 76 567 89 05', '+41 76 567 89 05', 'Langstrasse 88', 'Zürich', '8004', 'Switzerland', '1988-06-12', 'ta', 'whatsapp', 'walk_in', v_user_sales1, 'active', ARRAY['22K','Thali','Kodi'], true, true, 'standard', 15600.00, 6, 2400.00, 100.00, now() - interval '2 days', now() + interval '5 days', 'Wedding in March 2027. Interested in Thali and Kodi sets.');

  v_c[6] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[6], v_org_id, 'DJ-0006', 'Stefan', 'Becker', 'Stefan', 'stefan.becker@example.ch', '+41 76 678 90 06', null, 'Bahnhofstrasse 99', 'Zürich', '8001', 'Switzerland', '1983-09-18', 'de', 'email', 'google_ads', v_user_sales1, 'inactive', ARRAY['18K','ring'], false, false, 'restricted', 3400.00, 2, 0.00, 0.00, now() - interval '90 days', null, 'No marketing consent. Last purchase 14 months ago.');

  v_c[7] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[7], v_org_id, 'DJ-0007', 'Arun', 'Subramaniam', 'Arun', 'arun.subramaniam@example.ch', '+41 76 789 01 07', '+41 76 789 01 07', 'Industriestrasse 22', 'Bern', '3012', 'Switzerland', '1995-12-25', 'ta', 'whatsapp', 'referral', v_user_sales2, 'active', ARRAY['21K','piercing'], true, true, 'standard', 4500.00, 2, 0.00, 50.00, now() - interval '7 days', now() + interval '10 days', 'Interested in piercing jewellery and modern designs.');

  v_c[8] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[8], v_org_id, 'DJ-0008', 'Claudia', 'Bernasconi', 'Claudia', 'claudia.bernasconi@example.ch', '+41 76 890 12 08', '+41 76 890 12 08', 'Via Serafino 5', 'Lugano', '6900', 'Switzerland', '1992-04-03', 'it', 'email', 'facebook', v_user_sales2, 'lead', ARRAY['lab-grown','earrings'], true, false, 'standard', 0.00, 0, 0.00, 0.00, now() - interval '1 day', now() + interval '2 days', 'New lead from Facebook. Interested in lab-grown diamonds.');

  v_c[9] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[9], v_org_id, 'DJ-0009', 'Walter', 'Frick', 'Walter', 'walter.frick@example.ch', '+41 76 901 23 09', null, 'Marktgasse 1', 'Bern', '3011', 'Switzerland', '1965-08-14', 'de', 'phone', 'walk_in', v_user_sales1, 'active', ARRAY['22K','bracelet','men'], false, false, 'standard', 8900.00, 5, 0.00, 0.00, now() - interval '15 days', null, 'Prefers men''s jewellery. No digital communication.');

  v_c[10] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[10], v_org_id, 'DJ-0010', 'Saritha', 'Nair', 'Saritha', 'saritha.nair@example.ch', '+41 76 012 34 10', '+41 76 012 34 10', 'Schönberggasse 7', 'Zürich', '8001', 'Switzerland', '1991-02-20', 'ta', 'whatsapp', 'instagram', v_user_sales1, 'active', ARRAY['18K','necklace','rose_gold'], true, true, 'standard', 11200.00, 5, 600.00, 0.00, now() - interval '4 days', now() + interval '8 days', 'Loves rose gold. Birthday next month.');

  v_c[11] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[11], v_org_id, 'DJ-0011', 'Luc', 'Petit', 'Luc', 'luc.petit@example.ch', '+41 76 123 45 11', '+41 76 123 45 11', 'Rue de Lausanne 30', 'Genève', '1202', 'Switzerland', '1987-05-17', 'fr', 'email', 'jotform', v_user_sales2, 'lead', ARRAY['custom','engagement'], true, true, 'standard', 0.00, 0, 0.00, 0.00, now() - interval '2 days', now() + interval '1 days', 'Jotform enquiry for custom engagement ring. Budget 3000-5000 CHF.');

  v_c[12] := gen_random_uuid();
  INSERT INTO customers (id, organisation_id, customer_code, first_name, last_name, preferred_name, email, phone, whatsapp_number, address, city, postal_code, country, date_of_birth, preferred_language, preferred_channel, customer_source, assigned_employee_id, status, tags, marketing_consent, profiling_consent, privacy_status, lifetime_value, total_purchases, outstanding_balance, store_credit, last_interaction, next_follow_up, notes)
  VALUES (v_c[12], v_org_id, 'DJ-0012', 'Nisha', 'Patel', 'Nisha', 'nisha.patel@example.ch', '+41 76 234 56 12', '+41 76 234 56 12', 'Hardstrasse 44', 'Basel', '4052', 'Switzerland', '1993-10-11', 'en', 'whatsapp', 'referral', v_user_sales1, 'active', ARRAY['22K','saving_plan'], true, true, 'standard', 7800.00, 3, 1800.00, 0.00, now() - interval '6 days', now() + interval '12 days', 'On jewellery saving plan. Monthly payment due.');

  -- Customer contacts
  INSERT INTO customer_contacts (organisation_id, customer_id, type, value, label, is_primary) VALUES
    (v_org_id, v_c[1], 'email', 'anna.brunner.work@example.com', 'Work', false),
    (v_org_id, v_c[4], 'phone', '+41 22 555 44 33', 'Office', false),
    (v_org_id, v_c[5], 'email', 'deepa.wedding@example.ch', 'Wedding planning', false);

  -- Customer addresses
  INSERT INTO customer_addresses (organisation_id, customer_id, type, address, city, postal_code, country, is_default) VALUES
    (v_org_id, v_c[1], 'shipping', 'Seestrasse 45', 'Zürich', '8002', 'Switzerland', true),
    (v_org_id, v_c[4], 'shipping', 'Rue du Marché 8', 'Genève', '1201', 'Switzerland', true),
    (v_org_id, v_c[5], 'shipping', 'Langstrasse 88', 'Zürich', '8004', 'Switzerland', true);

  -- Customer preferences
  INSERT INTO customer_preferences (organisation_id, customer_id, category, value, source, confidence_score) VALUES
    (v_org_id, v_c[1], 'gold_karat', '22K', 'customer_confirmed', null),
    (v_org_id, v_c[1], 'gold_color', 'yellow', 'customer_confirmed', null),
    (v_org_id, v_c[1], 'product_interest', 'Thali sets', 'customer_confirmed', null),
    (v_org_id, v_c[1], 'budget_range', '5000-20000', 'employee_entered', null),
    (v_org_id, v_c[2], 'gold_karat', '18K', 'customer_confirmed', null),
    (v_org_id, v_c[2], 'gold_color', 'white', 'customer_confirmed', null),
    (v_org_id, v_c[2], 'diamond_type', 'lab_grown', 'customer_confirmed', null),
    (v_org_id, v_c[2], 'ring_size', '54', 'customer_confirmed', null),
    (v_org_id, v_c[2], 'budget_range', '5000-8000', 'customer_confirmed', null),
    (v_org_id, v_c[3], 'gold_karat', '21K', 'customer_confirmed', null),
    (v_org_id, v_c[3], 'gold_color', 'yellow', 'customer_confirmed', null),
    (v_org_id, v_c[3], 'product_interest', 'earrings', 'customer_confirmed', null),
    (v_org_id, v_c[3], 'anniversary', '2026-12-15', 'customer_confirmed', null),
    (v_org_id, v_c[4], 'gold_karat', '22K', 'customer_confirmed', null),
    (v_org_id, v_c[4], 'gold_color', 'white', 'customer_confirmed', null),
    (v_org_id, v_c[4], 'diamond_type', 'natural', 'customer_confirmed', null),
    (v_org_id, v_c[4], 'diamond_shape', 'round', 'customer_confirmed', null),
    (v_org_id, v_c[4], 'product_interest', 'necklaces', 'customer_confirmed', null),
    (v_org_id, v_c[5], 'gold_karat', '22K', 'customer_confirmed', null),
    (v_org_id, v_c[5], 'gold_color', 'yellow', 'customer_confirmed', null),
    (v_org_id, v_c[5], 'product_interest', 'Thali and Kodi sets', 'customer_confirmed', null),
    (v_org_id, v_c[5], 'wedding_date', '2027-03-20', 'customer_confirmed', null),
    (v_org_id, v_c[5], 'budget_range', '10000-25000', 'customer_confirmed', null),
    (v_org_id, v_c[7], 'gold_karat', '21K', 'customer_confirmed', null),
    (v_org_id, v_c[7], 'product_interest', 'piercing jewellery', 'customer_confirmed', null),
    (v_org_id, v_c[10], 'gold_karat', '18K', 'customer_confirmed', null),
    (v_org_id, v_c[10], 'gold_color', 'rose', 'customer_confirmed', null),
    (v_org_id, v_c[10], 'product_interest', 'necklaces', 'customer_confirmed', null),
    (v_org_id, v_c[10], 'birthday', '2026-10-15', 'customer_confirmed', null),
    (v_org_id, v_c[12], 'gold_karat', '22K', 'customer_confirmed', null),
    (v_org_id, v_c[12], 'product_interest', 'saving plan', 'customer_confirmed', null);

  INSERT INTO customer_preferences (organisation_id, customer_id, category, value, source, confidence_score, ai_provider, ai_model) VALUES
    (v_org_id, v_c[1], 'jewellery_style', 'traditional Indian', 'ai_inferred', 0.85, 'openai', 'gpt-4o'),
    (v_org_id, v_c[2], 'jewellery_style', 'modern minimalist', 'ai_inferred', 0.78, 'openai', 'gpt-4o'),
    (v_org_id, v_c[4], 'jewellery_style', 'classic luxury', 'ai_inferred', 0.92, 'anthropic', 'claude-sonnet'),
    (v_org_id, v_c[5], 'jewellery_style', 'bridal traditional', 'ai_inferred', 0.88, 'google', 'gemini-1.5-pro'),
    (v_org_id, v_c[10], 'jewellery_style', 'contemporary rose gold', 'ai_inferred', 0.80, 'openai', 'gpt-4o');

  INSERT INTO customer_consents (organisation_id, customer_id, consent_type, status, granted_at, source) VALUES
    (v_org_id, v_c[1], 'marketing', 'granted', now() - interval '180 days', 'website_form'),
    (v_org_id, v_c[1], 'profiling', 'granted', now() - interval '180 days', 'website_form'),
    (v_org_id, v_c[2], 'marketing', 'granted', now() - interval '90 days', 'in_store'),
    (v_org_id, v_c[3], 'marketing', 'granted', now() - interval '120 days', 'instagram'),
    (v_org_id, v_c[3], 'profiling', 'granted', now() - interval '120 days', 'instagram'),
    (v_org_id, v_c[4], 'marketing', 'granted', now() - interval '365 days', 'in_store'),
    (v_org_id, v_c[4], 'profiling', 'granted', now() - interval '365 days', 'in_store'),
    (v_org_id, v_c[5], 'marketing', 'granted', now() - interval '60 days', 'whatsapp'),
    (v_org_id, v_c[5], 'profiling', 'granted', now() - interval '60 days', 'whatsapp'),
    (v_org_id, v_c[6], 'marketing', 'withdrawn', now() - interval '200 days', 'email_request'),
    (v_org_id, v_c[10], 'marketing', 'granted', now() - interval '45 days', 'instagram'),
    (v_org_id, v_c[10], 'profiling', 'granted', now() - interval '45 days', 'instagram'),
    (v_org_id, v_c[12], 'marketing', 'granted', now() - interval '30 days', 'in_store');

  INSERT INTO leads (organisation_id, customer_id, source, status, priority, assigned_employee_id, notes, created_by) VALUES
    (v_org_id, v_c[8], 'facebook', 'new', 'high', v_user_sales2, 'Facebook lead form submission. Interested in lab-grown diamond earrings.', v_user_marketing),
    (v_org_id, v_c[11], 'jotform', 'new', 'high', v_user_sales2, 'Jotform enquiry for custom engagement ring. Budget 3000-5000 CHF.', v_user_marketing),
    (v_org_id, v_c[2], 'google_ads', 'contacted', 'medium', v_user_sales1, 'Google Ads click. Looking for custom engagement ring.', v_user_marketing),
    (v_org_id, v_c[7], 'referral', 'qualified', 'medium', v_user_sales2, 'Referred by existing customer DJ-0003.', v_user_sales1),
    (v_org_id, null, 'instagram', 'new', 'medium', v_user_sales1, 'Instagram DM enquiry about 22K gold bangles.', v_user_marketing),
    (v_org_id, null, 'walk_in', 'contacted', 'low', v_user_sales1, 'Walk-in enquiry about repair service. Left phone number.', v_user_sales1),
    (v_org_id, v_c[10], 'instagram', 'converted', 'low', v_user_sales1, 'Converted to customer. Purchased rose gold necklace.', v_user_marketing),
    (v_org_id, null, 'tiktok', 'new', 'medium', v_user_sales2, 'TikTok lead. Young customer interested in piercing jewellery.', v_user_marketing);

  -- PRODUCTS
  v_p[1] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[1], v_org_id, '22K Gold Thali Set', 'Thali Set', '22K', 'yellow', 45.500, null, 0, 1200.00, 75.00, 3537.50, 'Traditional 22K gold Thali set with intricate craftsmanship.', true, v_user_admin);
  v_p[2] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[2], v_org_id, '18K White Gold Diamond Ring', 'Rings', '18K', 'white', 6.200, 'natural diamond', 2500.00, 800.00, 65.00, 3703.00, 'Elegant 18K white gold ring with natural round diamond, 0.5ct.', true, v_user_admin);
  v_p[3] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[3], v_org_id, '21K Gold Necklace Set', 'Necklaces', '21K', 'yellow', 28.300, null, 0, 950.00, 72.00, 2926.60, 'Traditional 21K gold necklace set with handcrafted design.', true, v_user_admin);
  v_p[4] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[4], v_org_id, '18K Rose Gold Pendant', 'Necklaces', '18K', 'rose', 4.800, 'lab-grown diamond', 1200.00, 450.00, 65.00, 1962.00, 'Contemporary rose gold pendant with lab-grown diamond.', true, v_user_admin);
  v_p[5] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[5], v_org_id, '22K Gold Bracelet', 'Bracelets', '22K', 'yellow', 22.000, null, 0, 600.00, 75.00, 2250.00, 'Classic 22K gold bracelet with traditional pattern.', true, v_user_admin);
  v_p[6] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[6], v_org_id, '22K Gold Kodi Set', 'Kodi Set', '22K', 'yellow', 38.000, null, 0, 1000.00, 75.00, 3850.00, 'Traditional 22K gold Kodi set for weddings.', true, v_user_admin);
  v_p[7] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[7], v_org_id, '18K Gold Earrings', 'Earrings', '18K', 'yellow', 3.500, null, 0, 300.00, 65.00, 527.50, 'Lightweight 18K gold earrings for everyday wear.', true, v_user_admin);
  v_p[8] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[8], v_org_id, '21K Gold Nose Pin', 'Piercing', '21K', 'yellow', 1.200, null, 0, 150.00, 72.00, 236.40, '21K gold nose pin for piercing.', true, v_user_admin);
  v_p[9] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[9], v_org_id, 'Men''s 22K Gold Chain', 'Necklaces', '22K', 'yellow', 35.000, null, 0, 900.00, 75.00, 3525.00, 'Heavy 22K gold chain for men.', true, v_user_admin);
  v_p[10] := gen_random_uuid();
  INSERT INTO products (id, organisation_id, name, category, karat, gold_color, weight, stone_type, stone_price, making_charge, gold_rate, price, description, is_active, created_by)
  VALUES (v_p[10], v_org_id, '18K Gold Lab-Grown Diamond Earrings', 'Earrings', '18K', 'white', 4.000, 'lab-grown diamond', 1800.00, 500.00, 65.00, 2560.00, '18K white gold earrings with lab-grown diamonds.', true, v_user_admin);

  -- ORDERS
  v_o[1] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, customer_notes, created_by)
  VALUES (v_o[1], v_org_id, 'DJ-ORD-2025-0001', v_c[1], v_loc_zurich, v_user_sales1, '2025-01-15', 'collected', 3537.50, 0, 283.00, 3820.50, 1000.00, 0.00, 'bank_transfer', '2025-02-15', '2025-02-10', 'In-house', 'Thali set order for wedding.', 'Ready for collection.', v_user_sales1);
  v_o[2] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[2], v_org_id, 'DJ-ORD-2025-0002', v_c[2], v_loc_zurich, v_user_sales1, '2025-02-20', 'in_production', 3703.00, 200.00, 280.24, 3783.24, 1500.00, 2283.24, 'card', '2025-04-15', '2025-04-10', 'Swiss Gold Supplier', 'Custom engagement ring. 0.5ct round diamond.', v_user_sales1);
  v_o[3] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[3], v_org_id, 'DJ-ORD-2025-0003', v_c[3], v_loc_geneva, v_user_sales2, '2025-03-05', 'ready_for_collection', 2926.60, 0, 234.13, 3160.73, 1000.00, 2160.73, 'twint', '2025-03-20', '2025-03-15', 'In-house', 'Necklace set for anniversary.', v_user_sales2);
  v_o[4] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[4], v_org_id, 'DJ-ORD-2025-0004', v_c[4], v_loc_geneva, v_user_sales2, '2025-03-10', 'collected', 11250.00, 500.00, 860.00, 11610.00, 3000.00, 0.00, 'bank_transfer', '2025-04-10', '2025-04-05', 'Diamond Supplier AG', 'Multiple items: necklace + bracelet.', v_user_sales2);
  v_o[5] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[5], v_org_id, 'DJ-ORD-2025-0005', v_c[5], v_loc_zurich, v_user_sales1, '2025-04-01', 'awaiting_deposit', 7387.50, 0, 591.00, 7978.50, 0.00, 7978.50, null, '2025-04-15', '2025-06-01', 'In-house', 'Thali + Kodi set for March 2027 wedding. Awaiting 30% deposit.', v_user_sales1);
  v_o[6] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[6], v_org_id, 'DJ-ORD-2025-0006', v_c[1], v_loc_zurich, v_user_sales1, '2025-04-12', 'confirmed', 2250.00, 0, 180.00, 2430.00, 500.00, 1930.00, 'cash', '2025-05-12', '2025-05-05', 'In-house', '22K gold bracelet.', v_user_sales1);
  v_o[7] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[7], v_org_id, 'DJ-ORD-2025-0007', v_c[7], v_loc_geneva, v_user_sales2, '2025-05-03', 'collected', 236.40, 0, 18.91, 255.31, 0.00, 0.00, 'cash', '2025-05-03', '2025-05-03', 'In-house', '21K gold nose pin.', v_user_sales2);
  v_o[8] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[8], v_org_id, 'DJ-ORD-2025-0008', v_c[10], v_loc_zurich, v_user_sales1, '2025-05-18', 'collected', 1962.00, 100.00, 148.96, 2010.96, 500.00, 0.00, 'twint', '2025-06-18', '2025-06-10', 'In-house', 'Rose gold pendant with lab-grown diamond.', v_user_sales1);
  v_o[9] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[9], v_org_id, 'DJ-ORD-2025-0009', v_c[4], v_loc_geneva, v_user_sales2, '2025-06-20', 'ordered_from_supplier', 8500.00, 0, 680.00, 9180.00, 2000.00, 7180.00, 'bank_transfer', '2025-08-20', '2025-08-15', 'Diamond Supplier AG', 'Custom diamond necklace. 1.2ct oval.', v_user_sales2);
  v_o[10] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[10], v_org_id, 'DJ-ORD-2025-0010', v_c[9], v_loc_zurich, v_user_sales1, '2025-07-05', 'collected', 3525.00, 0, 282.00, 3807.00, 1000.00, 0.00, 'cash', '2025-08-05', '2025-07-25', 'In-house', 'Men''s 22K gold chain.', v_user_sales1);
  v_o[11] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[11], v_org_id, 'DJ-ORD-2025-0011', v_c[12], v_loc_zurich, v_user_sales1, '2025-08-01', 'confirmed', 2560.00, 0, 204.80, 2764.80, 500.00, 2264.80, 'twint', '2025-09-01', '2025-08-20', 'In-house', '18K lab-grown diamond earrings. Saving plan installment.', v_user_sales1);
  v_o[12] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[12], v_org_id, 'DJ-ORD-2025-0012', v_c[3], v_loc_geneva, v_user_sales2, '2025-08-15', 'quotation', 527.50, 0, 42.20, 569.70, 0.00, 569.70, null, '2025-08-30', '2025-08-25', 'In-house', '18K gold earrings. Quote sent to customer.', v_user_sales2);
  v_o[13] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[13], v_org_id, 'DJ-ORD-2025-0013', v_c[5], v_loc_zurich, v_user_sales1, '2025-09-01', 'draft', 3850.00, 0, 308.00, 4158.00, 0.00, 4158.00, null, null, null, 'In-house', 'Kodi set - draft quote.', v_user_sales1);
  v_o[14] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[14], v_org_id, 'DJ-ORD-2025-0014', v_c[1], v_loc_zurich, v_user_sales1, '2025-09-05', 'quality_control', 527.50, 0, 42.20, 569.70, 200.00, 369.70, 'card', '2025-09-20', '2025-09-15', 'In-house', '18K gold earrings. In QC.', v_user_sales1);
  v_o[15] := gen_random_uuid();
  INSERT INTO orders (id, organisation_id, order_number, customer_id, location_id, assigned_employee_id, order_date, status, subtotal, discount, vat, total, deposit, outstanding_balance, payment_method, due_date, expected_delivery_date, supplier, notes, created_by)
  VALUES (v_o[15], v_org_id, 'DJ-ORD-2025-0015', v_c[2], v_loc_zurich, v_user_sales1, '2025-09-08', 'awaiting_deposit', 3703.00, 0, 296.24, 3999.24, 0.00, 3999.24, null, '2025-09-25', '2025-10-15', 'Swiss Gold Supplier', 'Second custom ring order. Awaiting deposit confirmation.', v_user_sales1);

  -- ORDER ITEMS
  INSERT INTO order_items (organisation_id, order_id, product_id, product_name, category, karat, weight, gold_rate, making_charge, stone_price, discount, vat, total) VALUES
    (v_org_id, v_o[1], v_p[1], '22K Gold Thali Set', 'Thali Set', '22K', 45.500, 75.00, 1200.00, 0, 0, 283.00, 3820.50),
    (v_org_id, v_o[2], v_p[2], '18K White Gold Diamond Ring', 'Rings', '18K', 6.200, 65.00, 800.00, 2500.00, 200.00, 280.24, 3783.24),
    (v_org_id, v_o[3], v_p[3], '21K Gold Necklace Set', 'Necklaces', '21K', 28.300, 72.00, 950.00, 0, 0, 234.13, 3160.73),
    (v_org_id, v_o[4], v_p[3], '21K Gold Necklace Set', 'Necklaces', '21K', 28.300, 72.00, 950.00, 0, 500.00, 860.00, 11610.00),
    (v_org_id, v_o[5], v_p[1], '22K Gold Thali Set', 'Thali Set', '22K', 45.500, 75.00, 1200.00, 0, 0, 591.00, 7978.50),
    (v_org_id, v_o[6], v_p[5], '22K Gold Bracelet', 'Bracelets', '22K', 22.000, 75.00, 600.00, 0, 0, 180.00, 2430.00),
    (v_org_id, v_o[7], v_p[8], '21K Gold Nose Pin', 'Piercing', '21K', 1.200, 72.00, 150.00, 0, 0, 18.91, 255.31),
    (v_org_id, v_o[8], v_p[4], '18K Rose Gold Pendant', 'Necklaces', '18K', 4.800, 65.00, 450.00, 1200.00, 100.00, 148.96, 2010.96),
    (v_org_id, v_o[9], null, 'Custom Diamond Necklace', 'Necklaces', null, 0, 0, 0, 8500.00, 0, 680.00, 9180.00),
    (v_org_id, v_o[10], v_p[9], 'Men''s 22K Gold Chain', 'Necklaces', '22K', 35.000, 75.00, 900.00, 0, 0, 282.00, 3807.00),
    (v_org_id, v_o[11], v_p[10], '18K Gold Lab-Grown Diamond Earrings', 'Earrings', '18K', 4.000, 65.00, 500.00, 1800.00, 0, 204.80, 2764.80),
    (v_org_id, v_o[12], v_p[7], '18K Gold Earrings', 'Earrings', '18K', 3.500, 65.00, 300.00, 0, 0, 42.20, 569.70),
    (v_org_id, v_o[13], v_p[6], '22K Gold Kodi Set', 'Kodi Set', '22K', 38.000, 75.00, 1000.00, 0, 0, 308.00, 4158.00),
    (v_org_id, v_o[14], v_p[7], '18K Gold Earrings', 'Earrings', '18K', 3.500, 65.00, 300.00, 0, 0, 42.20, 569.70),
    (v_org_id, v_o[15], v_p[2], '18K White Gold Diamond Ring', 'Rings', '18K', 6.200, 65.00, 800.00, 2500.00, 0, 296.24, 3999.24);

  -- PAYMENTS
  INSERT INTO payments (organisation_id, payment_number, customer_id, order_id, amount, currency, payment_method, reference, status, employee_id, payment_date, created_by) VALUES
    (v_org_id, 'DJ-PAY-0001', v_c[1], v_o[1], 1000.00, 'CHF', 'bank_transfer', 'REF-001-DEPOSIT', 'completed', v_user_sales1, '2025-01-15', v_user_sales1),
    (v_org_id, 'DJ-PAY-0002', v_c[1], v_o[1], 2820.50, 'CHF', 'bank_transfer', 'REF-001-FINAL', 'completed', v_user_sales1, '2025-02-10', v_user_sales1),
    (v_org_id, 'DJ-PAY-0003', v_c[2], v_o[2], 1500.00, 'CHF', 'card', 'REF-002-DEPOSIT', 'completed', v_user_sales1, '2025-02-20', v_user_sales1),
    (v_org_id, 'DJ-PAY-0004', v_c[3], v_o[3], 1000.00, 'CHF', 'twint', 'REF-003-DEPOSIT', 'completed', v_user_sales2, '2025-03-05', v_user_sales2),
    (v_org_id, 'DJ-PAY-0005', v_c[4], v_o[4], 3000.00, 'CHF', 'bank_transfer', 'REF-004-DEPOSIT', 'completed', v_user_sales2, '2025-03-10', v_user_sales2),
    (v_org_id, 'DJ-PAY-0006', v_c[4], v_o[4], 8610.00, 'CHF', 'bank_transfer', 'REF-004-FINAL', 'completed', v_user_sales2, '2025-04-05', v_user_sales2),
    (v_org_id, 'DJ-PAY-0007', v_c[5], v_o[5], 0.00, 'CHF', 'other', 'AWAITING DEPOSIT', 'pending', v_user_sales1, '2025-04-01', v_user_sales1),
    (v_org_id, 'DJ-PAY-0008', v_c[1], v_o[6], 500.00, 'CHF', 'cash', 'REF-006-DEPOSIT', 'completed', v_user_sales1, '2025-04-12', v_user_sales1),
    (v_org_id, 'DJ-PAY-0009', v_c[7], v_o[7], 255.31, 'CHF', 'cash', 'REF-007-FULL', 'completed', v_user_sales2, '2025-05-03', v_user_sales2),
    (v_org_id, 'DJ-PAY-0010', v_c[10], v_o[8], 500.00, 'CHF', 'twint', 'REF-008-DEPOSIT', 'completed', v_user_sales1, '2025-05-18', v_user_sales1),
    (v_org_id, 'DJ-PAY-0011', v_c[10], v_o[8], 1510.96, 'CHF', 'twint', 'REF-008-FINAL', 'completed', v_user_sales1, '2025-06-10', v_user_sales1),
    (v_org_id, 'DJ-PAY-0012', v_c[4], v_o[9], 2000.00, 'CHF', 'bank_transfer', 'REF-009-DEPOSIT', 'completed', v_user_sales2, '2025-06-20', v_user_sales2);

  -- APPOINTMENTS
  INSERT INTO appointments (organisation_id, customer_id, employee_id, title, description, appointment_date, duration_minutes, location, status, created_by) VALUES
    (v_org_id, v_c[1], v_user_sales1, 'Thali Set Fitting', 'Final fitting for Thali set before collection.', now() + interval '3 days', 60, 'Zürich Main Showroom', 'scheduled', v_user_sales1),
    (v_org_id, v_c[2], v_user_sales1, 'Custom Ring Design Consultation', 'Design consultation for custom engagement ring.', now() + interval '5 days', 90, 'Zürich Main Showroom', 'scheduled', v_user_sales1),
    (v_org_id, v_c[5], v_user_sales1, 'Wedding Jewellery Viewing', 'Viewing of Thali and Kodi sets for March 2027 wedding.', now() + interval '7 days', 120, 'Zürich Main Showroom', 'scheduled', v_user_sales1),
    (v_org_id, v_c[3], v_user_sales2, 'Anniversary Gift Selection', 'Help selecting anniversary gift. Earrings and necklace.', now() + interval '10 days', 60, 'Geneva Rue du Rhône', 'scheduled', v_user_sales2),
    (v_org_id, v_c[4], v_user_sales2, 'Diamond Necklace Consultation', 'Consultation for custom 1.2ct oval diamond necklace.', now() + interval '14 days', 90, 'Geneva Rue du Rhône', 'scheduled', v_user_sales2),
    (v_org_id, v_c[10], v_user_sales1, 'Birthday Gift Preview', 'Preview of new rose gold collection for birthday.', now() + interval '21 days', 45, 'Zürich Main Showroom', 'scheduled', v_user_sales1),
    (v_org_id, v_c[12], v_user_sales1, 'Saving Plan Review', 'Monthly saving plan review and payment.', now() + interval '2 days', 30, 'Zürich Main Showroom', 'scheduled', v_user_sales1),
    (v_org_id, v_c[8], v_user_sales2, 'Lab-Grown Diamond Introduction', 'Introduction to lab-grown diamond options.', now() + interval '1 days', 60, 'Geneva Rue du Rhône', 'scheduled', v_user_sales2);

  -- TASKS
  INSERT INTO tasks (organisation_id, customer_id, assigned_to, title, description, due_date, priority, status, task_type, created_by) VALUES
    (v_org_id, v_c[2], v_user_sales1, 'Follow up on custom ring deposit', 'Customer has not yet paid the remaining deposit for custom ring order.', CURRENT_DATE + 3, 'high', 'pending', 'follow_up', v_user_manager),
    (v_org_id, v_c[5], v_user_sales1, 'Confirm wedding jewellery deposit', 'Confirm 30% deposit for Thali + Kodi set before production starts.', CURRENT_DATE + 5, 'high', 'pending', 'follow_up', v_user_manager),
    (v_org_id, v_c[3], v_user_sales2, 'Send anniversary reminder', 'Send WhatsApp reminder about upcoming anniversary and gift suggestions.', CURRENT_DATE + 1, 'medium', 'pending', 'reminder', v_user_sales2),
    (v_org_id, v_c[12], v_user_sales1, 'Collect saving plan payment', 'Monthly saving plan payment due from Nisha Patel.', CURRENT_DATE + 2, 'medium', 'pending', 'payment_reminder', v_user_sales1),
    (v_org_id, v_c[1], v_user_sales1, 'Schedule earring QC review', 'Order DJ-ORD-2025-0014 is in QC. Schedule review with customer.', CURRENT_DATE + 4, 'medium', 'pending', 'order_reminder', v_user_sales1),
    (v_org_id, v_c[6], v_user_sales1, 'Re-engage inactive customer', 'Customer has not purchased in 14 months. Send re-engagement offer.', CURRENT_DATE + 7, 'low', 'pending', 'follow_up', v_user_manager),
    (v_org_id, v_c[10], v_user_sales1, 'Send birthday offer', 'Birthday next month. Prepare personalised birthday offer.', CURRENT_DATE + 10, 'medium', 'pending', 'reminder', v_user_marketing),
    (v_org_id, v_c[8], v_user_sales2, 'Contact Facebook lead', 'New Facebook lead for lab-grown diamond earrings. Contact within 24h.', CURRENT_DATE, 'high', 'in_progress', 'follow_up', v_user_marketing),
    (v_org_id, v_c[11], v_user_sales2, 'Send Jotform enquiry response', 'Respond to Jotform enquiry about custom engagement ring.', CURRENT_DATE + 1, 'high', 'pending', 'follow_up', v_user_marketing),
    (v_org_id, null, v_user_sales1, 'Update product catalog', 'Add new piercing jewellery collection to catalog.', CURRENT_DATE + 14, 'low', 'pending', 'custom', v_user_admin);

  -- AUDIT LOGS
  INSERT INTO audit_logs (organisation_id, user_id, action, entity_type, entity_id, details) VALUES
    (v_org_id, v_user_admin, 'create_customer', 'customer', v_c[1], '{"customer_code": "DJ-0001", "name": "Anna Brunner"}'::jsonb),
    (v_org_id, v_user_sales1, 'create_order', 'order', v_o[1], '{"order_number": "DJ-ORD-2025-0001", "total": 3820.50}'::jsonb),
    (v_org_id, v_user_sales2, 'update_order_status', 'order', v_o[3], '{"old_status": "in_production", "new_status": "ready_for_collection"}'::jsonb),
    (v_org_id, v_user_admin, 'update_customer_consent', 'customer', v_c[1], '{"consent_type": "marketing", "status": "granted"}'::jsonb),
    (v_org_id, v_user_sales1, 'create_payment', 'payment', null, '{"amount": 1000.00, "method": "bank_transfer"}'::jsonb),
    (v_org_id, v_user_manager, 'assign_task', 'task', null, '{"title": "Follow up on custom ring deposit", "assigned_to": "Marco Rossi"}'::jsonb);

END $$;
