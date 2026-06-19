# Deploying Nexora to Render

## Steps

1. Go to [render.com](https://render.com) and sign up with GitHub.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Configure the service:
   - **Name:** nexora
   - **Region:** Singapore
   - **Branch:** main
   - **Root Directory:** *(leave empty)*
   - **Build Command:**
     ```
     cd artifacts/nexora && npm install && npm run build && cd ../api-server && npm install && npm run build
     ```
   - **Start Command:**
     ```
     cd artifacts/api-server && node dist/index.mjs
     ```
   - **Plan:** Free

5. Add **Environment Variables** in the Render dashboard:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |
   | `VITE_SUPABASE_URL` | your Supabase URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
   | `GROQ_API_KEY` | your Groq API key |
   | `RAZORPAY_KEY_ID` | your Razorpay key ID |
   | `RAZORPAY_KEY_SECRET` | your Razorpay key secret |

6. Click **Create Web Service**.
7. Wait 5–10 minutes for the build to complete.
8. Your URL will be: `https://nexora.onrender.com`

## After Deployment

Update **Supabase Auth** settings:
- **Site URL:** `https://nexora.onrender.com`
- **Redirect URLs:**
  - `http://localhost:5000/**`
  - `http://localhost:3000/**`
  - `https://nexora.onrender.com/**`

## Health Check

```bash
curl https://nexora.onrender.com/api/health
```

Should return `{ "status": "ok", "services": { "groq": { "status": "ok" }, "database": { "status": "ok" } } }`.
