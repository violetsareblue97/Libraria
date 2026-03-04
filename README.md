Libraria

A digital Library management web based system.

Main Features:
- Book List : List of books available in systems database, using API that already fetched
- Borrow & Return Books : Allows users to borrow books that are available, and return books that they were borrowed.
- Borrowed Book list : List of borrowed books that are in their account's record
- Log in and Registration : Systems Authentication to make sure web pages can only be accessed by authorized users.

Framework : Next.js
Language : Typescript
Styling : Tailwind
Database & Auth : Supabase (PostgreSQL, and RLS)
Book data : Open Library API
Icons : Lucide React


Make sure these are installed in your computer:
- [Node.js](https://nodejs.org/) version 18 or newest
- npm

## Steps
## 1. CLONE THIS REPO AND INSTALL DEPENDENCIES

copy:
git clone https://github.com/violetsareblue97/Libraria.git
cd libraria

copy:
```bash
npm install
```
## 2. ENIRONMENT VARIABLE FILES
copy:
```bash
cp .env.example .env.local
```

Input credentials in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase_anon_key
```

Get these credentials in -> Supabase Dashboard -> Project Settings -> API KEY
(MAKE NEW PROJECT IN SUPABASE FIRST)

## 3. DATABASE SETUP
1. Find supabase/schema.sql, in this project, and copy
2. Open your Supabase project dashboard
3. Open 'SQL Editor'
4. Paste the SQL command from schema.sql, then click run.

## 4. Run Development Server
Open Git Bash inside your root folder
copy and enter:
```bash
npm run dev
```
if it succeed, your project will run on localhost, open: 
[http://localhost:3000]
in browser to see the results.

## Project Structure
```bash
libraria/
├── app/
│   ├── auth/               # Login and Registrastion pave
│   ├── katalog/            # BOOK LIST page
│   ├── dashboard/          # Dashboard page
├── components/             # UI Components (SHADER AND HERO PAGE BACKGROUND ui in this folder)
├── lib/
│   ├── auth.ts             # Hook useAuth
│   ├── supabase.ts         # Supabase client
│   └── open-library.ts     # Open Library API
├── supabase/
│   └── schema.sql          # DATABASE SCHEMA
└── proxy.ts                # Middleware
```

## NOTE
- Row Level Security (RLS) : This project uses Supabase RLS for data safety. If you find that you cannot borrow books or data isn't appearing, make sure that you have executed the schema.sql properly in the Supabase SQL Editor
- Authentication Trigger : The system includes a database trigger that automatically creates a user profile in the profiles table upon sign-up. If you manually add users via the Supabase Auth dashboard, make sure the corresponding profile entry exists
- Local Development : When running locally, ensure your .env.local is not tracked by git (it is already included in .env.example)
- Open Library API : Book data is fetched dynamically. If cover images do not appear, it might be due to the Open Library API's rate limiting or the specific book not having a cover ID in their database.