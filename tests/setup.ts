process.env.NODE_ENV = "test";

process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "anon-key";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "service-role-key";

process.env.PORT = process.env.PORT ?? "0";

