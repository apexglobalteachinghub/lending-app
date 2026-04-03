# LendFlow — Full setup guide

Step-by-step instructions to run the **Next.js web console**, **Expo mobile app**, and **Supabase** backend for this monorepo.

## What you are installing

| Piece | Folder | Purpose |
|--------|--------|---------|
| Backend | (cloud) | PostgreSQL, Auth, RLS, Realtime, optional Edge Functions |
| Web app | `lending-web/` | Admin KPI dashboard, loans, users, support (staff/admin) |
| Mobile app | `lending-mobile/` | Customer loans, contact support, push token registration |

---

## Prerequisites

- **Node.js** 20+ (LTS recommended) and **npm**
- A **Supabase** account: [https://supabase.com](https://supabase.com)
- For physical-device push notifications: **Expo** account and optionally **EAS** ([https://expo.dev](https://expo.dev))
- For iOS builds: **macOS** and Xcode (or use **Expo EAS Build** in the cloud)

### Docker and Supabase — do you need it?

| Approach | Docker required? |
|----------|------------------|
| **Hosted Supabase** (this guide: project on [supabase.com](https://supabase.com), SQL in the dashboard, env keys in Next/Expo) | **No** |
| **Local Supabase** (`supabase start`, local Postgres, Studio on `localhost`) | **Yes** — [Docker Desktop](https://docs.docker.com/desktop/) must be installed and **running** |

If you see errors about `docker_engine`, `//./pipe/docker_engine`, or `supabase_db_…`, the CLI is trying to use **local** Docker. Either start Docker (see [Troubleshooting — Docker on Windows](#docker-on-windows-supabase-local)) or **skip local stacks** and use **hosted** Supabase only.

---

## Part 1 — Supabase

### 1.1 Create a project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → **New project**.
2. Choose a name, database password, and region. Wait until the project is **healthy**.

### 1.2 Get API keys

1. Open **Project Settings** (gear) → **API**.
2. Copy:
   - **Project URL** → you will use this as `NEXT_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_URL`.
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Copy **service_role** key only for **server-side** use (Edge Functions, scripts). **Never** put it in the mobile app or public web client.

### 1.3 Enable authentication

1. Go to **Authentication** → **Providers**.
2. Enable **Email** (email/password).  
3. (Optional) Configure **Site URL** and **Redirect URLs** when you deploy the web app (e.g. `https://your-domain.com`).

### 1.4 Apply the database schema (SQL migration)

1. In the dashboard, open **SQL Editor**.
2. Open the file in this repo:  
   `supabase/migrations/20260403000000_initial.sql`
3. Paste the **entire** contents into a new query and click **Run**.

4. **Customer profile fields** (mobile, address, reference person): run the second migration file in the same way:

   `supabase/migrations/20260404000000_profile_customer_fields.sql`

This creates:

- `profiles` (linked to `auth.users`, roles: `admin`, `staff`, `customer`)
- `loans`, `payments`, `support_messages`, `user_push_tokens`
- Row Level Security (RLS) policies
- Trigger to create a `profiles` row for new sign-ups (default role: `customer`)
- Realtime publication entries for `loans`, `payments`, `support_messages` (if your project already has these tables in `supabase_realtime`, you may need to skip duplicate `alter publication` lines — remove duplicates and re-run only the missing parts)

### 1.5 Create your first users and an admin

1. **Authentication** → **Users** → **Add user** (or sign up via the mobile app once it is configured).
2. Promote one user to **admin** in SQL Editor (replace the email):

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

3. Create **staff** the same way with `role = 'staff'` if needed.

**Rules:**

- **Web (`lending-web`)**: only `admin` and `staff` should sign in. Customers are redirected to use the app.
- **Mobile (`lending-mobile`)**: only `customer` can stay signed in; admin/staff are told to use the web console.

### 1.6 (Optional) Loan due-date push reminders — Edge Function

The repo includes `supabase/functions/loan-reminders/`, which:

- Finds loans due in **3 days** (status `pending` or `approved`)
- Sends Expo push notifications using tokens in `user_push_tokens`

**Using Supabase CLI** (install from [Supabase CLI docs](https://supabase.com/docs/guides/cli)):

1. Log in: `supabase login`
2. Link project: `supabase link --project-ref <your-project-ref>`
3. Deploy function (from repo root):

```bash
supabase functions deploy loan-reminders
```

4. In **Project Settings** → **Edge Functions** → **Secrets**, set at least:

   - `SUPABASE_URL` — same as Project URL  
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key  

   Optional: `EXPO_ACCESS_TOKEN` from [Expo](https://expo.dev/accounts/[account]/settings/access-tokens) for higher push throughput.

5. Schedule a **cron** (Dashboard → **Edge Functions** → your function → **Cron**) to run daily (e.g. `0 8 * * *` for 08:00 UTC).

Invoke URL shape (after deploy):  
`https://<project-ref>.supabase.co/functions/v1/loan-reminders`  
(Use the dashboard copy button for the exact URL.)

---

## Part 2 — Web app (Next.js)

### 2.1 Install dependencies

```bash
cd lending-web
npm install
```

### 2.2 Environment variables

1. Copy the example file:

```bash
copy .env.local.example .env.local
```

(On macOS/Linux: `cp .env.local.example .env.local`.)

2. Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2.3 Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Admin**: `/dashboard` (KPI), `/users`, `/loans`, `/support`
- **Staff**: `/loans`, `/support` (no KPI dashboard)
- **Login**: `/login`

### 2.4 Production build (check)

```bash
npm run build
npm start
```

### 2.5 Deploy (example: Vercel)

This monorepo has **`vercel.json` at the repository root** so Vercel can build **without** changing the dashboard, as long as the project’s **Root Directory** is the **repository root** (default when you import the whole repo):

- **`installCommand`:** `npm install --prefix lending-web`
- **`buildCommand`:** `npm run build --prefix lending-web`
- **`framework`:** `nextjs`

1. Push the repo to GitHub/GitLab.
2. **Import the repository** in [Vercel](https://vercel.com/new). Leave **Root Directory** empty or **`.`** (repo root) so the root `vercel.json` is used.
3. **Environment variables** (required — without them the app can misbehave or error at runtime):  
   **Settings → Environment Variables** → add for *Production* (and Preview if you use it):

   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key  

   Redeploy after saving env vars.

4. Deploy. Your site should respond on `/` and `/login`.

**Alternative:** Set **Root Directory** to `lending-web` in the Vercel project. Then Vercel runs `npm install` / `npm run build` *inside* that folder (the root `vercel.json` in the parent is **not** used). Clear any custom Install/Build commands in the dashboard so defaults apply.

5. Note your public URL (e.g. `https://your-app.vercel.app`) — use it for the mobile app’s **`EXPO_PUBLIC_WEB_APP_URL`** (support link).

### 2.6 Fix: Vercel NOT_FOUND or 404 after deploy

| Cause | What to do |
|--------|----------------|
| **Wrong project root** | If the repo root has no working Next app, Vercel may deploy an empty or wrong output. Use **repo root** + root `vercel.json`, **or** set **Root Directory** to `lending-web` and use default Next.js build (see §2.5). |
| **Missing env vars** | Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then **Redeploy**. |
| **Old deployment** | **Deployments** tab → open latest → confirm **Building** succeeded. Fix build errors first. |
| **Wrong URL** | Open the URL Vercel shows for that deployment (project `.vercel.app` domain). |
| **Custom domain** | **Settings → Domains** — wait for DNS/propagation if you just added a domain. |

The app’s `next.config.ts` sets **`turbopack.root`** to the `lending-web` folder so Next.js does not pick the **parent** `package-lock.json` as the workspace root (which can confuse builds in a monorepo).

---

## Part 3 — Mobile app (Expo)

### 3.1 Install dependencies

```bash
cd lending-mobile
npm install
```

### 3.2 Environment variables

1. Copy:

```bash
copy .env.example .env
```

(On macOS/Linux: `cp .env.example .env`.)

2. Edit `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_WEB_APP_URL=https://your-deployed-web-app.com
```

`EXPO_PUBLIC_WEB_APP_URL` must be the **origin only** (no trailing slash). The app opens:

`{EXPO_PUBLIC_WEB_APP_URL}/support`

### 3.3 Start Expo

```bash
npx expo start
```

Then press **a** (Android), **i** (iOS simulator on Mac), or scan the QR code with **Expo Go**.

### 3.4 NativeWind / Metro

This project uses **NativeWind v4** with:

- `babel.config.js`
- `metro.config.js` (`nativewind/metro` + `global.css`)
- `tailwind.config.js`

If styles do not apply, clear cache:

```bash
npx expo start -c
```

### 3.5 Push notifications and EAS project ID

- **Expo Go** / dev builds often need an **EAS project** for reliable `getExpoPushTokenAsync` in newer SDKs.

Recommended:

1. Install EAS CLI: `npm i -g eas-cli`
2. In `lending-mobile`: `eas init`
3. Add to `app.json` under `expo`:

```json
"extra": {
  "eas": {
    "projectId": "your-uuid-from-expo"
  }
}
```

Or use a dynamic `app.config.js` that reads from env — see [Expo projectId](https://docs.expo.dev/push-notifications/push-notifications-setup/).

The app registers the token in `user_push_tokens` after a **customer** signs in (and from **Profile → Register push reminders**).

### 3.6 Deep linking / app scheme

`app.json` sets `"scheme": "lendflow"` for custom URL schemes (`lendflow://...`).  
Opening the **support page on the web** uses `expo-linking` + `EXPO_PUBLIC_WEB_APP_URL` (HTTPS), not the custom scheme.

---

## Quick checklist

- [ ] Supabase project created; **Email** auth enabled  
- [ ] SQL migration applied; first **admin** promoted  
- [ ] `lending-web` `.env.local` filled; `npm run dev` works  
- [ ] Web deployed (optional); URL copied  
- [ ] `lending-mobile` `.env` filled including **`EXPO_PUBLIC_WEB_APP_URL`**  
- [ ] `npx expo start` runs; customer can sign in and submit support  
- [ ] (Optional) Edge Function **loan-reminders** deployed + cron + secrets  
- [ ] (Optional) EAS **projectId** for production push tokens  

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Web: “Invalid API key” | `NEXT_PUBLIC_SUPABASE_*` in `.env.local`; restart dev server |
| Mobile: cannot sign in | Same URL/key in `.env`; rebuild after changing env |
| Mobile: “Use the web app” | Account role is not `customer` — use web for staff/admin |
| Web: customer blocked at login | Expected — customers use the mobile app |
| RLS errors in app | Policies in migration; user must be logged in; role must match |
| Realtime SQL errors | Tables may already be in `supabase_realtime`; adjust migration |
| No push token | Physical device, permissions granted, EAS `projectId` if required |
| `open //./pipe/docker_engine: The system cannot find the file specified` | Docker Desktop is not running or not installed. See [Docker on Windows](#docker-on-windows-supabase-local) below. |
| `docker client must be run with elevated privileges` | Run **Docker Desktop** as Administrator once, or ensure your Windows user can use Docker; see below. |
| Vercel: **NOT_FOUND** / site empty after deploy | See **§2.6** — project root, `vercel.json`, Supabase env vars on Vercel, redeploy. |

### Docker on Windows (Supabase local)

Use this section only if you intentionally run **`supabase start`** or other local Supabase/Docker workflows. **For LendFlow with hosted Supabase, you can ignore Docker entirely** and follow **§1.1–1.4** in the dashboard.

1. **Install Docker Desktop for Windows**  
   Official install: [Docker Desktop on Windows](https://docs.docker.com/desktop/install/windows-install/).  
   Use the **WSL 2** backend when the installer prompts you (recommended).

2. **Start Docker Desktop**  
   Open Docker Desktop from the Start menu and wait until it says the engine is **running** (whale icon idle, no “starting…” forever).

3. **Verify from PowerShell or Command Prompt**

   ```bash
   docker version
   ```

   Both “Client” and “Server” should print versions. If **Server** errors, the engine is still not up.

4. **WSL 2**  
   If Docker asks you to install or update WSL 2, follow Microsoft’s [WSL install guide](https://learn.microsoft.com/en-us/windows/wsl/install), then restart Docker Desktop.

5. **“Elevated privileges” / pipe errors**  
   - Quit Docker Desktop fully, then **Run as administrator** once.  
   - In Docker Desktop → **Settings** → **General**, ensure **“Use the WSL 2 based engine”** is enabled (if you use WSL).  
   - Reboot Windows after a fresh Docker install if the pipe error persists.

6. **Corporate / locked-down PCs**  
   Some policies block Docker. In that case use **hosted Supabase only** (no `supabase start`).

After Docker works, retry your Supabase CLI command (e.g. `supabase start`). If you do not need a local database, use the **cloud project URL + anon key** in `.env.local` / `.env` and do not run `supabase start`.

---

## Publishing to GitHub (monorepo)

Use **one Git repository** at the **parent folder** that contains `lending-web/`, `lending-mobile/`, and `supabase/` (the same level as this `SETUP.md`).

### Before you push — secrets

- **Do not commit** `lending-web/.env.local`, `lending-mobile/.env`, or any file with **Supabase anon/service keys**, passwords, or tokens.
- The repo root includes a **`.gitignore`** that ignores `.env` / `.env.local` patterns. Keep using **`.env.local.example`** / **`.env.example`** only as templates (no real keys).
- **Never** put the **Supabase service_role** key in the repo (Edge Function secrets stay in the Supabase dashboard).

### 1. Resolve nested Git folders (if `create-next-app` / Expo created their own repos)

If `lending-web/.git` and/or `lending-mobile/.git` exist, either:

- **Recommended:** remove those nested repos so only the **root** repo tracks everything:

  **PowerShell** (run from the monorepo root — the folder that contains `lending-web`):

  ```powershell
  Remove-Item -Recurse -Force .\lending-web\.git -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .\lending-mobile\.git -ErrorAction SilentlyContinue
  ```

  Or delete the `.git` folders in File Explorer. **Backup first** if you had commits you care about only inside those subfolders.

- **Alternative:** keep only `lending-web` on GitHub and omit the rest (not recommended for this project).

### 2. Initialize Git at the monorepo root

From the folder that contains `SETUP.md`, `lending-web`, `lending-mobile`, and `supabase`:

```powershell
git init
git add .
git status
```

Confirm **`git status`** does **not** list `.env.local`, `.env`, or `node_modules`. If it does, fix `.gitignore` before committing.

```powershell
git commit -m "Initial commit: LendFlow lending web and mobile"
```

### 3. Create the repository on GitHub

1. Sign in to [GitHub](https://github.com).
2. Click **+** → **New repository**.
3. Choose a name (e.g. `lendflow`).
4. Leave **Add a README** unchecked if you already committed locally (avoids a merge conflict).
5. Create the repository.

### 4. Connect and push

Copy the URL GitHub shows (**HTTPS** or **SSH**). Example with HTTPS:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

If GitHub asks you to log in, use a [Personal Access Token](https://github.com/settings/tokens) as the password when using HTTPS, or set up [SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

#### `error: src refspec main does not match any`

Git has **no commit on `main` yet**. Commit first, then push:

```powershell
git add .
git status
git commit -m "Initial commit: LendFlow monorepo"
git push -u origin main
```

#### `embedded git repository` / empty `lending-web` on GitHub

If `lending-web` or `lending-mobile` still have their own **`.git`** folder, the parent repo may store them as **submodules** (folders look empty on GitHub). Remove nested `.git`, re-add, and commit:

```powershell
git rm -r --cached lending-web lending-mobile
Remove-Item -Recurse -Force .\lending-web\.git, .\lending-mobile\.git
git add lending-web lending-mobile
git commit -m "Track app folders as normal files (not submodules)"
git push
```

### 5. After the repo is on GitHub

- **Vercel / Netlify:** point the project at the repo and set the **root directory** to `lending-web` if the host asks for a subdirectory.
- **Collaborators:** **Settings** → **Collaborators** on the GitHub repo.
- **Private repo:** choose **Private** when creating the repository if the code should not be public.

### 6. Cloning on another machine

```powershell
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

Then copy env templates and install deps:

```powershell
copy lending-web\.env.local.example lending-web\.env.local
copy lending-mobile\.env.example lending-mobile\.env
cd lending-web; npm install; cd ..
cd lending-mobile; npm install; cd ..
```

Fill in real Supabase and web URLs in those env files locally — they stay **untracked**.

---

## Repo layout reference

```
lending-web/          # Next.js App Router + Tailwind
lending-mobile/       # Expo + NativeWind
supabase/
  migrations/         # SQL to run in Supabase
  functions/          # Edge Functions (e.g. loan-reminders)
```

For day-to-day Next.js commands, see `lending-web/README.md`.
