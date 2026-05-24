import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const MASTER_ADMIN_EMAIL = 'sharathnaikhelpline@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    
    // We use the service role key to initialize the admin client
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the JWT from the auth header and fetch the user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(jwt);
    if (callerError || !caller) throw new Error('Invalid token');

    // Only allow admin to manage staff
    const callerRole = caller.app_metadata?.role;
    if (callerRole !== 'admin' && caller.email !== MASTER_ADMIN_EMAIL) {
      throw new Error('Forbidden: Only administrators can manage staff.');
    }

    // 2. Parse request
    const { action, payload } = await req.json();

    let result;

    switch (action) {
      case 'list': {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;
        
        // Map users to a safe format for the frontend
        result = data.users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name || u.email?.split('@')[0],
          role: u.app_metadata?.role || 'staff',
          created_at: u.created_at
        }));
        break;
      }
      
      case 'create': {
        const { email, password, name, role } = payload;
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
          app_metadata: { role }
        });
        if (error) throw error;
        result = data.user;
        break;
      }
      
      case 'update': {
        const { id, name, email, role, password } = payload;
        
        // Protect master admin from being altered
        const { data: userToUpdate } = await supabaseAdmin.auth.admin.getUserById(id);
        if (userToUpdate?.user?.email === MASTER_ADMIN_EMAIL) {
           throw new Error('Forbidden: The Master Admin account cannot be modified.');
        }

        const updatePayload: any = {
          email,
          user_metadata: { name },
          app_metadata: { role }
        };
        
        // Only update password if provided
        if (password) {
            updatePayload.password = password;
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);
        if (error) throw error;
        result = data.user;
        break;
      }
      
      case 'delete': {
        const { id } = payload;
        
        // Protect master admin from deletion
        const { data: userToDelete } = await supabaseAdmin.auth.admin.getUserById(id);
        if (userToDelete?.user?.email === MASTER_ADMIN_EMAIL) {
           throw new Error('Forbidden: The Master Admin account cannot be deleted.');
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
