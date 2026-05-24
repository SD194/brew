import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
// Use the service role key to safely query the items without relying on RLS headers from the webhook
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); 

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record || payload; 

    if (record.status !== 'confirmed') {
      return new Response(JSON.stringify({ message: "Order is not confirmed yet. Skipping email." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!record.email) {
      return new Response(JSON.stringify({ message: "Guest skipped email entry. No receipt sent." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured.");
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Fetch order items from Supabase
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('name, price, quantity, notes')
      .eq('order_id', record.id);

    if (itemsError) {
      console.error("Failed to fetch order items:", itemsError);
    }

    // Create a shorter, human-readable order number from the UUID (e.g. "A3F9B2")
    const shortOrderId = record.id.split('-')[0].toUpperCase();

    // Build the items HTML list
    const itemsHtml = (items || []).map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">
        <div style="flex: 1;">
          <p style="margin: 0; font-size: 15px; font-weight: 600;">${item.quantity}x ${item.name}</p>
          ${item.notes ? `<p style="margin: 4px 0 0; font-size: 13px; color: #888;">Note: ${item.notes}</p>` : ''}
        </div>
        <div style="text-align: right; font-size: 15px; font-weight: 600; padding-left: 15px;">
          ₹${item.price * item.quantity}
        </div>
      </div>
    `).join('');

    const htmlInvoice = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; color: #333; background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="color: #c8102e; margin: 0; font-size: 24px; letter-spacing: -0.5px;">BrewSync Café</h1>
          <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">Digital Receipt</p>
        </div>
        
        <div style="background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
             <h2 style="margin: 0; font-size: 18px;">Order #${shortOrderId}</h2>
             <span style="background: #e6f4ea; color: #137333; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">Confirmed</span>
          </div>
          
          <p style="margin: 5px 0; font-size: 14px; color: #555;"><strong>Table Number:</strong> ${record.table_number}</p>
          <p style="margin: 5px 0 20px 0; font-size: 14px; color: #555;"><strong>Type:</strong> ${record.order_type === 'dine_in' ? 'Dine In' : 'Takeaway'}</p>
          
          <h3 style="margin-top: 25px; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Items Ordered</h3>
          ${itemsHtml}
          
          <div style="margin-top: 15px; font-size: 14px; text-align: right; color: #666;">
            <p style="margin: 5px 0;">Subtotal: ₹${record.subtotal}</p>
            ${record.discount > 0 ? `<p style="margin: 5px 0; color: #c8102e;">Discount: -₹${record.discount}</p>` : ''}
            <p style="margin: 5px 0;">CGST (2.5%): ₹${record.cgst}</p>
            <p style="margin: 5px 0;">SGST (2.5%): ₹${record.sgst}</p>
          </div>
          <hr style="border: none; border-top: 1px dashed #ccc; margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 16px; font-weight: bold;">Total Paid</span>
            <span style="font-size: 22px; font-weight: 800; color: #c8102e;">₹${record.total}</span>
          </div>
        </div>
        <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">Thank you for your order! Your food is now being prepared. We hope you enjoy your meal!</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BrewSync Cafe <hello@receipt.s194d.me>",
        to: [record.email],
        subject: `Your Receipt for Order #${shortOrderId}`,
        html: htmlInvoice,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
