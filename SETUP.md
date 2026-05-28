# AJS — Setup Checklist

## Step 1: Install dependencies (do this first)

```bash
cd ajs
npm install
```

---

## Step 2: Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `ajs`, pick a region, set a database password
3. Wait for it to provision (~1 min)

### Run the schema

- Open **SQL Editor** → **New query**
- Paste the contents of `supabase/schema.sql`
- Click **Run**
- Verify: **Table Editor** should show 5 tables: `profiles`, `sessions`, `check_ins`, `programs`, `program_logs`

### Create the avatars storage bucket

- Go to **Storage** → **New bucket**
- Name: `avatars`
- Toggle **Public bucket**: ON
- Click **Create bucket**

### Create test users

1. Go to **Authentication** → **Users** → **Add user** → **Create new user**
2. Create 3 users (email + password):
   - `admin@ajsclub.dk` / `password123`
   - `trainer@ajsclub.dk` / `password123`
   - `athlete@ajsclub.dk` / `password123`
3. Copy the UUID of each user from the Users table
4. In **SQL Editor**, run (replace the UUIDs):

```sql
insert into profiles (id, full_name, email, role, belt_rank, joined_at) values
  ('<admin-uuid>',   'Alexander Olsen', 'admin@ajsclub.dk',   'admin',   'black', '2020-01-01'),
  ('<trainer-uuid>', 'Coach Hansen',    'trainer@ajsclub.dk', 'trainer', 'black', '2021-03-01'),
  ('<athlete-uuid>', 'Lars Eriksen',    'athlete@ajsclub.dk', 'athlete', 'brown', '2022-09-01');
```

### Copy your API keys

- Go to **Project Settings** → **API**
- Copy **Project URL** and **anon public** key

---

## Step 3: Create `.env.local`

In the `ajs/` folder, copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Step 4: Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with one of the test accounts.

---

## Step 5: Deploy to Vercel

1. Push the `ajs/` folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo
3. In **Environment Variables**, add the same two vars from `.env.local`
4. Click **Deploy**

---

## Route reference

| Role    | Routes                                                                              |
|---------|-------------------------------------------------------------------------------------|
| Admin   | /dashboard, /admin/members, /admin/calendar, /admin/checkin, /trainer/athletes      |
| Trainer | /dashboard, /trainer/athletes, /trainer/athletes/[id], .../program/new              |
| Athlete | /dashboard, /athlete/profile, /athlete/checkin, /athlete/programs                  |
