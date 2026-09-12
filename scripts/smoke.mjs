import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) throw new Error('Missing Supabase environment variables');

const supabase = createClient(url, key);
const created = [];
const results = [];
const suffix = Date.now().toString().slice(-8);

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function insert(table, values) {
  const { data, error } = await supabase.from(table).insert(values).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
  created.push({ table, id: data.id });
  results.push(`${table}:create`);
  return data;
}

try {
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@dubaijewellery.example.ch',
    password: 'demo1234',
  });
  if (authError) throw authError;
  assert(auth.user, 'Demo login returned no user');
  results.push('auth:login');

  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('auth_user_id', auth.user.id).single();
  if (profileError) throw profileError;
  assert(profile.organisation_id, 'Profile has no organisation');
  results.push('profile:read');

  const customer = await insert('customers', {
    organisation_id: profile.organisation_id,
    customer_code: `TEST-${suffix}`,
    first_name: 'Smoke',
    last_name: 'Test',
    email: `smoke-${suffix}@example.invalid`,
    city: 'Zürich',
    tags: ['automated-test'],
    created_by: profile.id,
  });

  const product = await insert('products', {
    organisation_id: profile.organisation_id,
    name: `Test Ring ${suffix}`,
    category: 'Rings',
    karat: '18K',
    price: 100,
    created_by: profile.id,
  });

  await insert('leads', {
    organisation_id: profile.organisation_id,
    customer_id: customer.id,
    source: 'walk_in',
    status: 'new',
    priority: 'medium',
    created_by: profile.id,
  });

  const order = await insert('orders', {
    organisation_id: profile.organisation_id,
    customer_id: customer.id,
    order_number: `TEST-ORDER-${suffix}`,
    status: 'draft',
    subtotal: 100,
    total: 100,
    deposit: 25,
    outstanding_balance: 75,
    created_by: profile.id,
  });

  await insert('payments', {
    organisation_id: profile.organisation_id,
    customer_id: customer.id,
    order_id: order.id,
    payment_number: `TEST-PAY-${suffix}`,
    amount: 25,
    payment_method: 'cash',
    status: 'completed',
    employee_id: profile.id,
    created_by: profile.id,
  });

  const task = await insert('tasks', {
    organisation_id: profile.organisation_id,
    customer_id: customer.id,
    title: `Test follow-up ${suffix}`,
    status: 'pending',
    priority: 'medium',
    created_by: profile.id,
  });

  const { error: taskError } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
  if (taskError) throw taskError;
  results.push('tasks:update');

  const preference = await insert('customer_preferences', {
    organisation_id: profile.organisation_id,
    customer_id: customer.id,
    category: 'karat',
    value: '18K',
    source: 'ai_inferred',
    confidence_score: 0.9,
  });
  const { error: preferenceError } = await supabase.from('customer_preferences').update({ approved_at: new Date().toISOString() }).eq('id', preference.id);
  if (preferenceError) throw preferenceError;
  results.push('preferences:update');

  await insert('customer_consents', {
    organisation_id: profile.organisation_id,
    customer_id: customer.id,
    consent_type: 'profiling',
    status: 'granted',
    granted_at: new Date().toISOString(),
    source: 'automated_test',
  });

  const { data: dashboardCustomers, error: dashboardError } = await supabase.from('customers').select('id').limit(1);
  if (dashboardError) throw dashboardError;
  assert(Array.isArray(dashboardCustomers), 'Dashboard query failed');
  results.push('dashboard:read');
} finally {
  const cleanupOrder = ['customer_consents', 'customer_preferences', 'tasks', 'payments', 'orders', 'leads', 'products', 'customers'];
  for (const table of cleanupOrder) {
    for (const item of created.filter(entry => entry.table === table)) {
      const { error } = await supabase.from(table).delete().eq('id', item.id);
      if (error) throw new Error(`${table} cleanup failed: ${error.message}`);
    }
  }
  await supabase.auth.signOut();
}

console.log(JSON.stringify({ ok: true, checks: results.length, results }));
