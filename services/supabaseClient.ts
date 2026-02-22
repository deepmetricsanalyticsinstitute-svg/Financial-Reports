import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Anon Key
const SUPABASE_URL = "https://aysbfigtenmdkuoctupl.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_Nq06ZY4brm0kdqpBn5GyCQ_eNwXL4cq";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
