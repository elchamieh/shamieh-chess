# Shamieh Chess v0.1

Initial MVP foundation for:

- `shamiehchess.com` — public website
- `app.shamiehchess.com` — academy platform
- Test deployment — Vercel project URL

## v0.1 scope

### Roles
- Admin
- Coach
- Student

### Branches
- Saida
- Beirut

### Levels
- Starters
- Beginners
- Intermediate
- Advanced

### Core workflows
1. Admin creates/manages classes.
2. Admin places students in one active class.
3. Admin assigns coaches to specific classes.
4. Coaches can only see students in assigned classes.
5. Coaches can create homework only for assigned classes.
6. Students can see homework for their own class.
7. Admin creates tournaments.
8. Students can register for open tournaments.

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor.
3. Copy `.env.example` to `.env.local`.
4. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Install and run:
   ```bash
   npm install
   npm run dev
   ```
6. Deploy to Vercel.
7. In Supabase Auth, create the first user.
8. Change that profile's role to `admin` in the `profiles` table.

## Important security design

Permissions are implemented using Supabase Row Level Security (RLS), not only UI visibility.

- Admin: all academy data.
- Coach: only assigned classes and students enrolled in them.
- Student: only own enrollment/class homework and own tournament registrations.

## Next implementation step

Build real CRUD screens:
- `/portal/students`
- `/portal/classes`
- `/portal/coaches`
- `/portal/homework`
- `/portal/tournaments`

The current dashboards are the v0.1 shell and access-control foundation.
