import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId, message, orgId } = await req.json();

    if (!sessionId || !message || !orgId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Save user message
    await supabase.from("ai_chat_messages").insert({
      organisation_id: orgId,
      session_id: sessionId,
      role: "user",
      content: message,
    });

    // Fetch CRM data for context
    const [customersRes, ordersRes, leadsRes, productsRes, paymentsRes, tasksRes] = await Promise.all([
      supabase.from("customers").select("*").eq("organisation_id", orgId).is("deleted_at", null),
      supabase.from("orders").select("*").eq("organisation_id", orgId).is("deleted_at", null),
      supabase.from("leads").select("*").eq("organisation_id", orgId),
      supabase.from("products").select("*").eq("organisation_id", orgId).is("deleted_at", null),
      supabase.from("payments").select("*").eq("organisation_id", orgId),
      supabase.from("tasks").select("*").eq("organisation_id", orgId),
    ]);

    const customers = customersRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const leads = leadsRes.data ?? [];
    const products = productsRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const tasks = tasksRes.data ?? [];

    // Build a summary of CRM data
    const validOrders = orders.filter((o: Record<string, unknown>) =>
      !["cancelled", "refunded", "draft"].includes(o.status as string)
    );
    const totalRevenue = validOrders.reduce((sum: number, o: Record<string, unknown>) => sum + (o.total as number), 0);
    const openOrders = orders.filter((o: Record<string, unknown>) =>
      !["collected", "cancelled", "refunded"].includes(o.status as string)
    );
    const unpaidBalance = validOrders.reduce((sum: number, o: Record<string, unknown>) =>
      sum + (o.outstanding_balance as number), 0
    );
    const newLeads = leads.filter((l: Record<string, unknown>) => l.status === "new");
    const convertedLeads = leads.filter((l: Record<string, unknown>) => l.status === "converted");
    const pendingTasks = tasks.filter((t: Record<string, unknown>) => t.status === "pending");
    const completedTasks = tasks.filter((t: Record<string, unknown>) => t.status === "completed");

    // Category breakdown
    const catRevenue: Record<string, number> = {};
    validOrders.forEach((o: Record<string, unknown>) => {
      const items = (o.order_items ?? []) as Array<Record<string, unknown>>;
      items.forEach((item) => {
        const cat = (item.category ?? "Other") as string;
        catRevenue[cat] = (catRevenue[cat] ?? 0) + (item.total as number);
      });
    });
    const topCategories = Object.entries(catRevenue)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);

    // Top customers by LTV
    const topCustomers = [...customers]
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        (b.lifetime_value as number) - (a.lifetime_value as number))
      .slice(0, 5)
      .map((c: Record<string, unknown>) => ({
        name: `${c.first_name} ${c.last_name}`,
        ltv: c.lifetime_value,
        purchases: c.total_purchases,
      }));

    // Payment method breakdown
    const payMethods: Record<string, number> = {};
    payments.forEach((p: Record<string, unknown>) => {
      const method = p.payment_method as string;
      payMethods[method] = (payMethods[method] ?? 0) + (p.amount as number);
    });

    const crmContext = `CRM Data Summary:
- Total Customers: ${customers.length}
- Active Customers: ${customers.filter((c: Record<string, unknown>) => c.status === "active").length}
- Total Orders: ${orders.length}
- Open Orders: ${openOrders.length}
- Total Revenue (valid orders): CHF ${totalRevenue.toFixed(2)}
- Outstanding Balances: CHF ${unpaidBalance.toFixed(2)}
- Total Leads: ${leads.length}
- New Leads: ${newLeads.length}
- Converted Leads: ${convertedLeads.length}
- Pending Tasks: ${pendingTasks.length}
- Completed Tasks: ${completedTasks.length}
- Total Products: ${products.length}

Top Categories by Revenue:
${topCategories.map(([cat, rev]) => `- ${cat}: CHF ${(rev as number).toFixed(2)}`).join("\n")}

Top 5 Customers by Lifetime Value:
${topCustomers.map(c => `- ${c.name}: CHF ${c.ltv} (${c.purchases} purchases)`).join("\n")}

Payment Methods:
${Object.entries(payMethods).map(([method, amount]) => `- ${method}: CHF ${(amount as number).toFixed(2)}`).join("\n")}

Product List:
${products.slice(0, 10).map((p: Record<string, unknown>) => `- ${p.name} (${p.category}, ${p.karat ?? "N/A"}): CHF ${p.price}`).join("\n")}

Recent Orders:
${validOrders.slice(0, 5).map((o: Record<string, unknown>) => `- ${o.order_number}: ${o.status}, CHF ${o.total}`).join("\n")}
`;

    // Try to call an AI provider, fall back to local analysis
    let aiResponse = "";
    let title = "";

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    const systemPrompt = `You are an AI assistant for a jewellery CRM (Dubai Jewellery GmbH, a Swiss jewellery business). Answer questions about the business based on the CRM data provided. Be concise, professional, and helpful. Use CHF for all monetary values. If the question is about something not in the data, say so.

${crmContext}`;

    if (openaiKey) {
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          aiResponse = data.choices?.[0]?.message?.content ?? "";
        }
      } catch (err) {
        console.error("OpenAI error:", err);
      }
    }

    if (!aiResponse && geminiKey) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: `${systemPrompt}\n\nUser question: ${message}` }] },
            ],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        }
      } catch (err) {
        console.error("Gemini error:", err);
      }
    }

    if (!aiResponse && anthropicKey) {
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 500,
            system: systemPrompt,
            messages: [{ role: "user", content: message }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          aiResponse = data.content?.[0]?.text ?? "";
        }
      } catch (err) {
        console.error("Anthropic error:", err);
      }
    }

    // Fallback: generate a local response based on the CRM data
    if (!aiResponse) {
      aiResponse = generateLocalResponse(message, {
        customers, orders: validOrders, allOrders: orders, leads, products, payments, tasks,
        totalRevenue, unpaidBalance, topCategories, topCustomers, payMethods,
        openOrders, pendingTasks, completedTasks,
      });
    }

    // Generate a title from the first message
    if (message.length > 0) {
      title = message.slice(0, 40) + (message.length > 40 ? "..." : "");
    }

    // Save AI response
    await supabase.from("ai_chat_messages").insert({
      organisation_id: orgId,
      session_id: sessionId,
      role: "assistant",
      content: aiResponse,
    });

    // Update session title if it's "New Chat"
    await supabase
      .from("ai_chat_sessions")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({ response: aiResponse, title }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

interface LocalData {
  customers: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  allOrders: Record<string, unknown>[];
  leads: Record<string, unknown>[];
  products: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  totalRevenue: number;
  unpaidBalance: number;
  topCategories: [string, number][];
  topCustomers: { name: string; ltv: number; purchases: number }[];
  payMethods: Record<string, number>;
  openOrders: Record<string, unknown>[];
  pendingTasks: Record<string, unknown>[];
  completedTasks: Record<string, unknown>[];
}

function generateLocalResponse(question: string, data: LocalData): string {
  const q = question.toLowerCase();

  if (q.includes("top-selling") || q.includes("top selling") || q.includes("best selling") || q.includes("product categor")) {
    if (data.topCategories.length === 0) return "No sales data available yet.";
    const lines = data.topCategories.map(([cat, rev]) =>
      `- ${cat}: CHF ${(rev as number).toFixed(2)}`);
    return `Here are the top-selling product categories by revenue:\n\n${lines.join("\n")}`;
  }

  if (q.includes("lifetime value") || q.includes("highest value") || q.includes("top customer") || q.includes("best customer")) {
    if (data.topCustomers.length === 0) return "No customer data available.";
    const lines = data.topCustomers.map(c =>
      `- ${c.name}: CHF ${c.ltv.toFixed(2)} (${c.purchases} purchases)`);
    return `Here are your top customers by lifetime value:\n\n${lines.join("\n")}`;
  }

  if (q.includes("in production") || q.includes("production")) {
    const inProd = data.allOrders.filter((o: Record<string, unknown>) => o.status === "in_production");
    if (inProd.length === 0) return "There are no orders currently in production.";
    const lines = inProd.map((o: Record<string, unknown>) =>
      `- ${o.order_number}: CHF ${o.total}`);
    return `There are ${inProd.length} orders currently in production:\n\n${lines.join("\n")}`;
  }

  if (q.includes("outstanding") || q.includes("unpaid") || q.includes("balance")) {
    return `The total outstanding balance across all orders is CHF ${data.unpaidBalance.toFixed(2)}.\n\nThere are ${data.openOrders.length} open orders in total.`;
  }

  if (q.includes("revenue") || q.includes("sales") || q.includes("total")) {
    return `Total revenue from valid orders is CHF ${data.totalRevenue.toFixed(2)} across ${data.orders.length} orders.\n\nThe average order value is CHF ${(data.totalRevenue / Math.max(data.orders.length, 1)).toFixed(2)}.`;
  }

  if (q.includes("lead") || q.includes("conversion")) {
    const rate = data.leads.length > 0
      ? Math.round((data.completedTasks.length / data.leads.length) * 100)
      : 0;
    return `You have ${data.leads.length} total leads. ${data.leads.filter((l: Record<string, unknown>) => l.status === "new").length} are new, ${data.leads.filter((l: Record<string, unknown>) => l.status === "converted").length} have been converted.`;
  }

  if (q.includes("task") || q.includes("follow")) {
    return `You have ${data.pendingTasks.length} pending tasks and ${data.completedTasks.length} completed tasks.`;
  }

  if (q.includes("customer") && q.includes("how many")) {
    return `You have ${data.customers.length} total customers. ${data.customers.filter((c: Record<string, unknown>) => c.status === "active").length} are active, ${data.customers.filter((c: Record<string, unknown>) => c.status === "inactive").length} are inactive.`;
  }

  if (q.includes("payment") || q.includes("method")) {
    const lines = Object.entries(data.payMethods).map(([method, amount]) =>
      `- ${method.replace(/_/g, " ")}: CHF ${(amount as number).toFixed(2)}`);
    return `Here's the breakdown by payment method:\n\n${lines.join("\n")}`;
  }

  if (q.includes("product") || q.includes("catalog")) {
    return `You have ${data.products.length} products in your catalog. Here are a few:\n\n${data.products.slice(0, 5).map((p: Record<string, unknown>) => `- ${p.name} (${p.category}, ${p.karat ?? "N/A"}): CHF ${p.price}`).join("\n")}`;
  }

  return `I can help you analyse your CRM data. You have ${data.customers.length} customers, ${data.orders.length} valid orders (CHF ${data.totalRevenue.toFixed(2)} revenue), ${data.leads.length} leads, and ${data.products.length} products.\n\nTry asking about:\n- Top-selling categories\n- Top customers by lifetime value\n- Outstanding balances\n- Orders in production\n- Payment method breakdown`;
}
