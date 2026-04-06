-- ============================================================
-- TaskFlow — Supabase Database Setup
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────
-- 1. Create the "tasks" table
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_name  TEXT NOT NULL,
    date       DATE,
    time       TIME,
    completed  BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add an index on user_id for faster per-user queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- ──────────────────────────────────────────
-- 2. Create the "admin_users" table
--    (stores which users have admin privileges)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────
-- 3. Enable Row Level Security (RLS)
-- ──────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────
-- 4. RLS Policies for "tasks"
-- ──────────────────────────────────────────

-- Users can SELECT only their own tasks
CREATE POLICY "Users can view own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

-- Users can INSERT only with their own user_id
CREATE POLICY "Users can insert own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE only their own tasks
CREATE POLICY "Users can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can DELETE only their own tasks
CREATE POLICY "Users can delete own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- 5. RLS Policies for "admin_users"
-- ──────────────────────────────────────────

-- Any authenticated user can check if they are admin
CREATE POLICY "Users can check own admin status"
    ON admin_users FOR SELECT
    USING (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- 6. Admin Database Functions
--    These use SECURITY DEFINER to bypass RLS
--    but internally check if the caller is an admin.
-- ──────────────────────────────────────────

-- Function: Get all tasks (admin only)
CREATE OR REPLACE FUNCTION get_all_tasks()
RETURNS TABLE (
    id         UUID,
    user_id    UUID,
    task_name  TEXT,
    date       DATE,
    time       TIME,
    completed  BOOLEAN,
    created_at TIMESTAMPTZ,
    user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the calling user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: admin only';
    END IF;

    -- Return all tasks joined with user email
    RETURN QUERY
        SELECT
            t.id,
            t.user_id,
            t.task_name,
            t.date,
            t.time,
            t.completed,
            t.created_at,
            u.email::TEXT AS user_email
        FROM tasks t
        JOIN auth.users u ON u.id = t.user_id
        ORDER BY t.created_at DESC;
END;
$$;

-- Function: Get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id         UUID,
    email      TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    task_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the calling user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: admin only';
    END IF;

    -- Return all users with their task count
    RETURN QUERY
        SELECT
            u.id,
            u.email::TEXT,
            u.created_at,
            u.last_sign_in_at,
            COALESCE(COUNT(t.id), 0) AS task_count
        FROM auth.users u
        LEFT JOIN tasks t ON t.user_id = u.id
        GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at
        ORDER BY u.created_at DESC;
END;
$$;

-- ──────────────────────────────────────────
-- 7. AFTER SIGNUP: Make a user an admin
--    Replace 'your-email@example.com' with your actual email.
-- ──────────────────────────────────────────
-- Run this AFTER you have signed up:
--
-- INSERT INTO admin_users (user_id)
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';
--
-- ──────────────────────────────────────────
