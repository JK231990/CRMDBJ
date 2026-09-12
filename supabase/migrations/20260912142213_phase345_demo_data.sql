/*
# Phase 3/4/5 Demo Data

## Overview
Seeds fictional demo data for conversations, messages, and campaigns.

## Data Created
1. 8 conversations across email, WhatsApp, Facebook, Instagram, Jotform channels
2. 20+ messages within those conversations
3. 5 campaigns in various states (draft, scheduled, sent)
*/

DO $$
DECLARE
  v_org_id uuid;
  v_c uuid[] := '{}';
  v_user_sales1 uuid;
  v_user_sales2 uuid;
  v_user_marketing uuid;
  v_conv uuid[] := '{}';
BEGIN
  SELECT id INTO v_org_id FROM organisations ORDER BY created_at LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_user_sales1 FROM profiles WHERE email = 'sales1@dubaijewellery.example.ch' LIMIT 1;
  SELECT id INTO v_user_sales2 FROM profiles WHERE email = 'sales2@dubaijewellery.example.ch' LIMIT 1;
  SELECT id INTO v_user_marketing FROM profiles WHERE email = 'marketing@dubaijewellery.example.ch' LIMIT 1;

  -- Get first 8 customer IDs
  SELECT array_agg(id ORDER BY customer_code) INTO v_c FROM customers WHERE organisation_id = v_org_id LIMIT 8;

  -- Conversation 1: Email from Anna Brunner about Thali set
  v_conv[1] := gen_random_uuid();
  INSERT INTO conversations (id, organisation_id, customer_id, channel, external_id, subject, status, priority, assigned_to, last_message_at, last_message_preview, unread_count)
  VALUES (v_conv[1], v_org_id, v_c[1], 'email', 'gmail-msg-001', 'Question about 22K Thali set availability', 'open', 'high', v_user_sales1, now() - interval '2 hours', 'Hi, is the 22K Thali set still available for...', 2);

  INSERT INTO messages (organisation_id, conversation_id, customer_id, sender_type, sender_name, body, is_read, created_at) VALUES
    (v_org_id, v_conv[1], v_c[1], 'customer', 'Anna Brunner', 'Hi, I saw the 22K Gold Thali Set on your website. Is it still available? I would like to come see it in person.', true, now() - interval '5 hours'),
    (v_org_id, v_conv[1], v_c[1], 'agent', 'Marco Rossi', 'Dear Anna, yes the 22K Gold Thali Set is available! Would you like to schedule a viewing at our Zürich showroom?', true, now() - interval '4 hours'),
    (v_org_id, v_conv[1], v_c[1], 'customer', 'Anna Brunner', 'That would be great! Could I come this Saturday afternoon? Also, what is the current gold rate for 22K?', false, now() - interval '2 hours');

  -- Conversation 2: WhatsApp from Thomas Fischer about ring
  v_conv[2] := gen_random_uuid();
  INSERT INTO conversations (id, organisation_id, customer_id, channel, external_id, subject, status, priority, assigned_to, last_message_at, last_message_preview, unread_count)
  VALUES (v_conv[2], v_org_id, v_c[2], 'whatsapp', 'wa-msg-002', 'Custom engagement ring inquiry', 'open', 'high', v_user_sales1, now() - interval '30 minutes', 'Perfect, I will come by tomorrow...', 1);

  INSERT INTO messages (organisation_id, conversation_id, customer_id, sender_type, sender_name, body, is_read, created_at) VALUES
    (v_org_id, v_conv[2], v_c[2], 'customer', 'Thomas Fischer', 'Hello! I am looking for a custom engagement ring. Budget around 5000-8000 CHF. Can you help?', true, now() - interval '3 hours'),
    (v_org_id, v_conv[2], v_c[2], 'agent', 'Marco Rossi', 'Hi Thomas! Absolutely, we specialise in custom rings. We can offer 18K white gold with a natural or lab-grown diamond. Would you prefer a round or oval cut?', true, now() - interval '2 hours'),
    (v_org_id, v_conv[2], v_c[2], 'customer', 'Thomas Fischer', 'I think round cut. Can I see some options?', true, now() - interval '1 hour'),
    (v_org_id, v_conv[2], v_c[2], 'agent', 'Marco Rossi', 'Of course! I have 3 options ready. When can you visit?', true, now() - interval '45 minutes'),
    (v_org_id, v_conv[2], v_c[2], 'customer', 'Thomas Fischer', 'Perfect, I will come by tomorrow afternoon around 2pm.', false, now() - interval '30 minutes');

  -- Conversation 3: Instagram DM from Giulia Conti
  v_conv[3] := gen_random_uuid();
  INSERT INTO conversations (id, organisation_id, customer_id, channel, external_id, subject, status, priority, assigned_to, last_message_at, last_message_preview, unread_count)
  VALUES (v_conv[3], v_org_id, v_c[3], 'instagram', 'ig-msg-003', 'Instagram DM about earrings', 'open', 'normal', v_user_sales2, now() - interval '1 day', 'Love the earrings! Do you have...', 0);

  INSERT INTO messages (organisation_id, conversation_id, customer_id, sender_type, sender_name, body, is_read, created_at) VALUES
    (v_org_id, v_conv[3], v_c[3], 'customer', 'Giulia Conti', 'Love the earrings in your latest post! Do you have them in 21K yellow gold?', true, now() - interval '1 day 2 hours'),
    (v_org_id, v_conv[3], v_c[3], 'agent', 'Lukas Müller', 'Hi Giulia! Yes we do have the 21K yellow gold version. They are 3.5g, priced at CHF 527.50. Would you like to reserve a pair?', true, now() - interval '1 day'),
    (v_org_id, v_conv[3], v_c[3], 'customer', 'Giulia Conti', 'Yes please! I will pick them up from Geneva store this week.', true, now() - interval '1 day');

  -- Conversation 4: Facebook message from new lead
  v_conv[4] := gen_random_uuid();
  INSERT INTO conversations (id, organisation_id, customer_id, channel, external_id, subject, status, priority, assigned_to, last_message_at, last_message_preview, unread_count)
  VALUES (v_conv[4], v_org_id, v_c[8], 'facebook', 'fb-msg-004', 'Facebook enquiry about lab-grown diamonds', 'pending', 'high', v_user_sales2, now() - interval '3 hours', 'Are lab-grown diamonds certified?', 3);

  INSERT INTO messages (organisation_id, conversation_id, customer_id, sender_type, sender_name, body, is_read, created_at) VALUES
    (v_org_id, v_conv[4], v_c[8], 'customer', 'Claudia Bernasconi', 'Hi, I saw your Facebook ad about lab-grown diamond earrings. Are they certified?', false, now() - interval '4 hours'),
    (v_org_id, v_conv[4], v_c[8], 'customer', 'Claudia Bernasconi', 'Also what is the price difference vs natural diamonds?', false, now() - interval '3 hours'),
    (v_org_id, v_conv[4], v_c[8], 'customer', 'Claudia Bernasconi', 'And do you offer TWINT payment?', false, now() - interval '3 hours');

  -- Conversation 5: Jotform submission from Luc Petit
  v_conv[5] := gen_random_uuid();
  INSERT INTO conversations (id, organisation_id, customer_id, channel, external_id, subject, status, priority, assigned_to, last_message_at, last_message_preview, unread_count)
  VALUES (v_conv[5], v_org_id, v_c[11], 'jotform', 'jf-005', 'Jotform: Custom engagement ring enquiry', 'open', 'high', v_user_sales2, now() - interval '6 hours', 'Budget: 3000-5000 CHF, round cut...', 1);

  INSERT INTO messages (organisation_id, conversation_id, customer_id, sender_type, sender_name, body, is_read, created_at) VALUES
    (v_org_id, v_conv[5], v_c[11], 'customer', 'Luc Petit', 'Name: Luc Petit\nEmail: luc.petit@example.ch\nBudget: 3000-5000 CHF\nRing type: Engagement ring\nDiamond: Round cut\nGold: 18K white\nMessage: Looking for a simple elegant engagement ring.', false, now() - interval '6 hours');

  -- Conversation 6: Email from Jean-Pierre Martin
  v_conv[6] := gen_random_uuid();
  INSERT INTO conversations (id, organisation_id, customer_id, channel, external_id, subject, status, priority, assigned_to, last_message_at, last_message_preview, unread_count)
  VALUES (v_conv[6], v_org_id, v_c[4], 'email', 'gmail-msg-006', 'Order DJ-ORD-2025-0009 status update', 'resolved', 'normal', v_user_sales2, now() - interval '2 days', 'Thank you for the update!', 0);

  INSERT INTO messages (organisation_id, conversation_id, customer_id, sender_type, sender_name, body, is_read, created_at) VALUES
    (v_org_id, v_conv[6], v_c[4], 'customer', 'Jean-Pierre Martin', 'Hello, can you give me an update on my custom diamond necklace order DJ-ORD-2025-0009?', true, now() - interval '3 days'),
    (v_org_id, v_conv[6], v_c[4], 'agent', 'Lukas Müller', 'Dear Jean-Pierre, the 1.2ct oval diamond has been sourced and is now with our goldsmith. Expected delivery is August 15 as planned.', true, now() - interval '2 days 4 hours'),
    (v_org_id, v_conv[6], v_c[4], 'customer', 'Jean-Pierre Martin', 'Thank you for the update! Looking forward to seeing it.', true, now() - interval '2 days');

  -- Conversation 7: WhatsApp from Deepa Rajan about wedding jewellery
  v_conv[7] := gen_random_uuid();
  INSERT INTO conversations (id, organisation_id, customer_id, channel, external_id, subject, status, priority, assigned_to, last_message_at, last_message_preview, unread_count)
  VALUES (v_conv[7], v_org_id, v_c[5], 'whatsapp', 'wa-msg-007', 'Wedding jewellery - Thali and Kodi sets', 'open', 'high', v_user_sales1, now() - interval '1 hour', 'When can we come for the fitting?', 1);

  INSERT INTO messages (organisation_id, conversation_id, customer_id, sender_type, sender_name, body, is_read, created_at) VALUES
    (v_org_id, v_conv[7], v_c[5], 'customer', 'Deepa Rajan', 'Hi Marco, we are planning for our March 2027 wedding. We want to order the Thali and Kodi sets. How far in advance should we order?', true, now() - interval '2 hours'),
    (v_org_id, v_conv[7], v_c[5], 'agent', 'Marco Rossi', 'Hi Deepa! For custom Thali and Kodi sets, we recommend ordering 3-4 months in advance. Since your wedding is March 2027, we should start the design process by November 2026.', true, now() - interval '1 hour 30 minutes'),
    (v_org_id, v_conv[7], v_c[5], 'customer', 'Deepa Rajan', 'That sounds good. When can we come for the fitting?', false, now() - interval '1 hour');

  -- Conversation 8: Email from Saritha Nair about saving plan
  v_conv[8] := gen_random_uuid();
  INSERT INTO conversations (id, organisation_id, customer_id, channel, external_id, subject, status, priority, assigned_to, last_message_at, last_message_preview, unread_count)
  VALUES (v_conv[8], v_org_id, v_c[12], 'email', 'gmail-msg-008', 'Saving plan monthly payment', 'resolved', 'low', v_user_sales1, now() - interval '5 days', 'Payment made via TWINT', 0);

  INSERT INTO messages (organisation_id, conversation_id, customer_id, sender_type, sender_name, body, is_read, created_at) VALUES
    (v_org_id, v_conv[8], v_c[12], 'customer', 'Saritha Nair', 'Hi, my monthly saving plan payment is due. Can I pay via TWINT?', true, now() - interval '6 days'),
    (v_org_id, v_conv[8], v_c[12], 'agent', 'Marco Rossi', 'Hi Saritha! Yes, TWINT is fine. The monthly installment is CHF 450. Please use reference SAV-NAIR-09.', true, now() - interval '5 days 2 hours'),
    (v_org_id, v_conv[8], v_c[12], 'customer', 'Saritha Nair', 'Payment made via TWINT. Thank you!', true, now() - interval '5 days');

  -- CAMPAIGNS
  INSERT INTO campaigns (organisation_id, name, description, channel, status, segment_rules, audience_count, template_subject, template_body, sent_count, opened_count, clicked_count, scheduled_at, sent_at, created_by) VALUES
    (v_org_id, 'Winter 2025 Gold Collection Launch', 'Email campaign announcing new winter gold collection to VIP customers', 'email', 'sent', '{"tags": ["VIP"], "status": "active", "marketing_consent": true}'::jsonb, 5, 'New Winter 2025 Gold Collection at Dubai Jewellery', 'Dear {first_name},\n\nWe are thrilled to announce our new Winter 2025 Gold Collection, featuring exclusive 22K and 21K pieces handcrafted by our master goldsmiths.\n\nVisit our Zürich or Geneva showroom to explore the full collection.\n\nWarm regards,\nDubai Jewellery Team', 5, 4, 2, null, now() - interval '10 days', v_user_marketing),

    (v_org_id, 'Diwali Special Offer - 22K Gold', 'WhatsApp campaign for Diwali festival offering special making charge discount', 'whatsapp', 'sent', '{"tags": ["22K"], "preferred_language": ["ta", "en"], "marketing_consent": true}'::jsonb, 4, '', 'Happy Diwali! Get 20% off making charges on all 22K gold items this week only. Visit Dubai Jewellery Zürich or Geneva. Reply STOP to opt out.', 4, 3, 3, null, now() - interval '20 days', v_user_marketing),

    (v_org_id, 'Christmas Gift Guide 2025', 'Email campaign featuring gift ideas for Christmas', 'email', 'scheduled', '{"status": "active", "marketing_consent": true}'::jsonb, 8, 'Christmas Gift Guide from Dubai Jewellery', 'Dear {first_name},\n\nLooking for the perfect Christmas gift? Explore our curated gift guide featuring diamond earrings, gold pendants, and bracelets for every budget.\n\nFrom CHF 527 to CHF 11,000, we have something special for everyone.\n\nVisit us in Zürich or Geneva.', 0, 0, 0, now() + interval '14 days', null, v_user_marketing),

    (v_org_id, 'Valentine Day 2026 Diamond Preview', 'Email campaign for Valentine diamond jewellery', 'email', 'draft', '{"tags": ["earrings", "necklace"], "marketing_consent": true}'::jsonb, 3, 'Valentine''s Day Diamond Preview', 'Dear {first_name},\n\nValentine''s Day is coming! Preview our exclusive diamond collection, featuring natural and lab-grown diamonds in 18K white gold settings.\n\nBook a private viewing at our showroom.', 0, 0, 0, null, null, v_user_marketing),

    (v_org_id, 'Re-engagement - Inactive Customers', 'Email campaign to re-engage customers who have not purchased in 12+ months', 'email', 'draft', '{"status": "inactive", "marketing_consent": true}'::jsonb, 1, 'We miss you at Dubai Jewellery', 'Dear {first_name},\n\nIt has been a while since your last visit. We would love to welcome you back! Enjoy a special 15% discount on your next purchase.\n\nVisit us in Zürich or Geneva.', 0, 0, 0, null, null, v_user_marketing);

END $$;