import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DemoUser {
  email: string;
  password: string;
  role: string;
}

const demoUsers: DemoUser[] = [
  { email: "admin@dubaijewellery.example.ch", password: "demo1234", role: "super_admin" },
  { email: "manager@dubaijewellery.example.ch", password: "demo1234", role: "manager" },
  { email: "sales1@dubaijewellery.example.ch", password: "demo1234", role: "sales_employee" },
  { email: "sales2@dubaijewellery.example.ch", password: "demo1234", role: "sales_employee" },
  { email: "marketing@dubaijewellery.example.ch", password: "demo1234", role: "marketing_employee" },
  { email: "accounts@dubaijewellery.example.ch", password: "demo1234", role: "accountant" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const user of demoUsers) {
      // Check if user already exists
      const { data: existing } = await adminClient.auth.admin.listUsers();
      const found = existing?.users?.find((u: { email: string }) => u.email === user.email);

      if (found) {
        // Update password
        const { error } = await adminClient.auth.admin.updateUserById(found.id, {
          password: user.password,
          email_confirm: true,
        });
        if (error) {
          results.push({ email: user.email, status: "updated_failed", error: error.message });
        } else {
          results.push({ email: user.email, status: "updated" });
        }
      } else {
        // Create new user
        const { error } = await adminClient.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });
        if (error) {
          results.push({ email: user.email, status: "create_failed", error: error.message });
        } else {
          results.push({ email: user.email, status: "created", });
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
