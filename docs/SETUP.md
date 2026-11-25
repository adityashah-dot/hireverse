# HireVerse — Local Dev Setup Guide

---

## PART 1 — ONE-TIME SETUP (do this once, never again)

### Step 1 — Install Prerequisites

| Tool | Link | Why |
|------|------|-----|
| Node.js 20+ | https://nodejs.org | Run Next.js |
| Docker Desktop | https://www.docker.com/products/docker-desktop | Run Redis |
| Git | already installed | — |

After installing Docker Desktop, **launch it** and wait for the whale icon to appear in the system tray (it must be running before you use it).

---

### Step 2 — Clone & Install Dependencies

```powershell
# In your project folder
npm install
```

---

### Step 3 — Create Your .env.local

Copy the example file and fill in your credentials:

```powershell
copy .env.example .env.local
```

Open `.env.local` and fill in every value:

```env
# ---- DATABASE (Supabase) ----
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# ---- AUTH ----
NEXTAUTH_SECRET="any-long-random-string-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
NODE_ENV="development"

# ---- AI ----
OPENAI_API_KEY="sk-..."        # GPT-4 — question generation
GROQ_API_KEY="gsk_..."         # Llama 3.3 70B — resume parsing

# ---- REDIS ----
REDIS_URL="redis://localhost:6379"

# ---- EMAIL (Resend) ----
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# ---- FILE STORAGE (S3 or Cloudflare R2) ----
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_BUCKET="hireverse-uploads"
S3_REGION="us-east-1"
# S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"   # R2 only
# S3_PUBLIC_URL="https://pub-xxx.r2.dev"                        # R2 only
```

> **Minimum to get the app running:** `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
> Everything else makes specific features work (AI, email, file upload).

---

### Step 4 — Set Up the Database

```powershell
# Generate Prisma client
npm run prisma:generate

# Run all migrations (creates all tables)
npm run prisma:migrate

# Optional: seed with demo data (creates a test company + jobs + candidates)
npm run prisma:seed
```

---

### Step 5 — Verify Docker is Working

```powershell
docker --version
# Should print: Docker version 24.x.x or similar

docker-compose up -d
# Should print: Creating hireverse_redis ... done

docker ps
# Should show hireverse_redis running
```

---

That's it. One-time setup complete. You never need to do Steps 1–5 again on this machine.

---

## PART 2 — EVERY TIME YOU WORK (daily startup)

### Terminal 1 — Start Redis

```powershell
docker-compose up -d
```

> Redis persists its data in a Docker volume so your queued jobs survive restarts.
> If Docker Desktop is already open and Redis is already running, this command is a no-op — safe to run every time.

**Verify Redis is up:**
```powershell
docker ps
# hireverse_redis should show "Up X minutes"
```

---

### Terminal 2 — Start the BullMQ Worker

Open a **new terminal** and run:

```powershell
npm run worker
```

You should see:
```
[Workers] Resume, email, and assessment workers started
```

> Keep this terminal open the whole time you work. This process handles:
> - Resume parsing (Groq AI)
> - Email sending (Resend)
> - Assessment question generation (OpenAI GPT-4)

---

### Terminal 3 — Start the Dev Server

Open another **new terminal** and run:

```powershell
npm run dev
```

You should see:
```
▲ Next.js 16.x
- Local: http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

### Summary — 3 Commands Every Day

```powershell
# Terminal 1
docker-compose up -d

# Terminal 2
npm run worker

# Terminal 3
npm run dev
```

---

## PART 3 — USEFUL COMMANDS (as needed)

### Database

```powershell
# After changing prisma/schema.prisma
npm run prisma:generate
npm run prisma:migrate

# Open the database GUI (Prisma Studio)
npm run prisma:studio
# Opens http://localhost:5555 — browse and edit data visually

# Re-seed demo data (WARNING: adds duplicate data, don't run twice)
npm run prisma:seed
```

### Redis / Docker

```powershell
# Check what's running
docker ps

# Stop Redis (end of day, saves memory)
docker-compose down

# Stop Redis AND delete all data (nuclear — use only if Redis is broken)
docker-compose down -v

# View Redis logs
docker logs hireverse_redis
```

### Build & Lint

```powershell
# Check for TypeScript errors + build for production
npm run build

# Run ESLint
npm run lint
```

---

## PART 4 — TROUBLESHOOTING

### "Cannot connect to Redis"
- Make sure Docker Desktop is open (system tray)
- Run `docker-compose up -d` again
- Run `docker ps` — `hireverse_redis` must show status `Up`

### "Prisma client not generated"
```powershell
npm run prisma:generate
```

### "Database connection failed"
- Check `DATABASE_URL` and `DIRECT_URL` in `.env.local`
- Make sure your Supabase project is not paused (free tier pauses after inactivity)

### Worker crashes immediately
- Check `REDIS_URL=redis://localhost:6379` is in `.env.local`
- Ensure Redis is running (`docker ps`)
- Check `OPENAI_API_KEY` and `GROQ_API_KEY` are valid

### Port 3000 already in use
```powershell
# Find and kill the process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Jobs not processing (resume stuck, emails not sending)
- Worker terminal must be open and showing no errors
- Check the worker terminal for error messages
- Restart worker: `Ctrl+C` then `npm run worker` again

---

## PART 5 — PROJECT STRUCTURE QUICK REFERENCE

```
app/
  (auth)/          # Sign in, sign up pages
  (dashboard)/     # All recruiter dashboard pages
  (assessment)/    # Candidate-facing assessment UI (public)
  api/             # All API routes

lib/
  ai/              # Groq resume parsing, OpenAI question generation
  queue/           # BullMQ job definitions and worker
  data/            # Cached data fetchers (dashboard analytics etc.)
  email.ts         # Email templates + Resend sender
  auth.ts          # NextAuth config
  prisma.ts        # Prisma client singleton
  storage.ts       # S3/R2 file uploads

prisma/
  schema.prisma    # Database schema — edit this to change data models
```

---

> **Stack:** Next.js 16 · PostgreSQL (Supabase) · Redis (Docker) · BullMQ · Prisma · OpenAI · Groq · Resend
