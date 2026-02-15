# Bookmark Manager

A modern bookmark management application built with Next.js and Supabase.

Users authenticate with Google, store personal bookmarks with optional metadata, and experience real-time synchronization across multiple browser tabs.

---

## Features

- Google Authentication (Supabase Auth)
- Automatic user profile creation
- Create, view, and delete bookmarks
- Optional name and description for each bookmark
- Optimistic UI updates (no refetch flicker)
- Live real-time updates across browser tabs
- Row Level Security (RLS) for user data isolation
- Clean, theme-based UI system

---

## Tech Stack

- **Frontend**: Next.js (App Router)
- **Database & Auth**: Supabase
- **Styling**: TailwindCSS
- **Realtime Updates**: Supabase Realtime
- **Deployment**: Vercel

---

## Authentication Flow

- Users sign in with Google OAuth.
- Supabase automatically creates a record in `auth.users`.
- A database trigger ensures a corresponding record exists in `public.profiles`.
- No separate signup page is required.
- If a user does not exist, Supabase handles the signup process automatically.

