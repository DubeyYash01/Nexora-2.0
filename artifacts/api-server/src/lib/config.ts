export const config = {
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",

  supabase: {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  },

  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:5000",
  },
};

const required: Array<[string, string]> = [
  ["supabase.url", config.supabase.url],
  ["groq.apiKey", config.groq.apiKey],
];

for (const [key, value] of required) {
  if (!value) {
    console.warn(`Warning: Missing config: ${key}`);
  }
}

export default config;
