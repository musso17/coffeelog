import { createClient } from '@supabase/supabase-js';

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vxxomvhpquseccejsdfp.supabase.co';
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eG9tdmhwcXVzZWNjZWpzZGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDYwOTMsImV4cCI6MjA3NjIyMjA5M30.J_k6YeA6bl2Ckt9AA-vDUmyE8L7GLgxP0VxBcPdHzjU';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
