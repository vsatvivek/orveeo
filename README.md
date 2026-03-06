# Orveeo

Barber appointment booking application built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI:** shadcn/ui, Radix UI
- **Data:** TanStack Query, TanStack Table
- **Database:** PostgreSQL + Drizzle ORM
- **Storage:** AWS S3 (for file uploads)
- **Auth:** JWT + HTTP-only cookies

## Getting Started

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account (for database)
- npm or pnpm

### Quick Demo Setup (Supabase)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) → New Project

2. **Get the database URL**:
   - Supabase Dashboard → **Settings** → **Database**
   - Under **Connection string**, select **URI**
   - Copy the **Connection pooler** URL (Transaction mode, port 6543)
   - Replace `[YOUR-PASSWORD]` with your database password

3. **Clone and install**:
   ```bash
   npm install
   cp .env.example .env.local
   ```

4. **Configure `.env.local`** – set at minimum:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```
   Plus Firebase and SMTP vars (see below).

5. **Push schema and run**:
   ```bash
   npm run db:push
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Local PostgreSQL (Alternative)

For local development with a local PostgreSQL instance:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/orveeo"
```

### Authentication (Firebase Auth)

- **Login:** `/login` - Email/password or Google OAuth
- **Register:** `/register` - Create new account
- **Forgot Password:** `/forgot-password` - Request password reset (Firebase sends email)
- **Reset Password:** `/reset-password?oobCode=...` - Set new password (from Firebase email link)

### API Documentation

- **Swagger UI:** `/api-docs` - Interactive API documentation
- **OpenAPI JSON:** `/api/swagger` - Raw OpenAPI spec

### Database Commands

- `npm run db:generate` - Generate migrations
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Drizzle Studio

### Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** > **Sign-in method** > **Email/Password** and **Google**
3. Copy your config from Project Settings > General > Your apps
4. Add to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

5. **Password reset:** In Firebase Console > Authentication > Templates > Password reset, set **Customize action URL** to `http://localhost:3000/reset-password` (dev) or your production URL.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Auth routes (login, register, forgot-password)
│   ├── api/auth/        # Auth API routes
│   ├── dashboard/       # Protected dashboard
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn/ui components
│   └── signout-button.tsx
├── db/
│   ├── schema.ts        # Drizzle schema
│   └── index.ts         # Database connection
├── lib/
│   ├── auth.ts          # Auth utilities
│   └── utils.ts
└── providers/
    └── query-provider.tsx
```

## Deploy to Vercel

1. **Install Vercel CLI** (optional, for direct deploy):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via GitHub** (recommended):
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click **Add New Project** → Import your repository
   - Vercel auto-detects Next.js

3. **Add environment variables** in Vercel Dashboard → Project → Settings → Environment Variables:
   - `DATABASE_URL` - PostgreSQL connection string (use **Supabase Connection Pooler** URL for prod)
   - `JWT_SECRET` - Generate a secure random string
   - `NEXT_PUBLIC_APP_URL` - Your Vercel URL (e.g. `https://your-app.vercel.app`)
   - `NEXT_PUBLIC_FIREBASE_*` - Firebase client config
   - `FIREBASE_ADMIN_*` - Firebase Admin SDK credentials
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Email config

4. **Firebase Authorized Domains**: Add your Vercel domain (e.g. `your-app.vercel.app`) in Firebase Console → Authentication → Authorized domains.

5. **Deploy**: Push to trigger a new deployment, or run `vercel deploy --prod` from CLI.

### Supabase Database (Demo & Production)

1. Create a project at [Supabase](https://supabase.com)
2. Go to **Settings** → **Database** → copy **Connection pooler** URI (port 6543)
3. Use the same URL for both local dev and Vercel `DATABASE_URL`
4. Run `npm run db:push` to create tables

## License

© 2026 Orveeo. All rights reserved.
