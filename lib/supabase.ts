import { createClient } from '@supabase/supabase-js';

// Si Next.js no encuentra la llave en el milisegundo de construcción, usa un enlace falso válido para no explotar.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

export const supabase = createClient(supabaseUrl, supabaseKey);