/**
 * auth.js — Authentication Module
 *
 * Handles signup, login, logout, session management,
 * and admin status checking using Supabase Auth.
 *
 * Depends on: supabase-config.js (must be loaded first)
 */

'use strict';

const Auth = (() => {
    // ── Get the Supabase client ──
    const getClient = () => window._supabase;

    /**
     * Sign up a new user with email and password.
     * @param {string} email
     * @param {string} password
     * @returns {Object} { data, error }
     */
    async function signUp(email, password) {
        const { data, error } = await getClient().auth.signUp({
            email,
            password,
        });
        return { data, error };
    }

    /**
     * Sign in an existing user with email and password.
     * @param {string} email
     * @param {string} password
     * @returns {Object} { data, error }
     */
    async function signIn(email, password) {
        const { data, error } = await getClient().auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    }

    /**
     * Sign out the current user.
     * Clears the session from the browser.
     * @returns {Object} { error }
     */
    async function signOut() {
        const { error } = await getClient().auth.signOut();
        return { error };
    }

    /**
     * Get the currently logged-in user (from local session).
     * @returns {Object|null} The user object, or null if not logged in.
     */
    async function getUser() {
        const { data: { user } } = await getClient().auth.getUser();
        return user;
    }

    /**
     * Get the current session.
     * @returns {Object|null} The session object, or null.
     */
    async function getSession() {
        const { data: { session } } = await getClient().auth.getSession();
        return session;
    }

    /**
     * Check if the current user is an admin.
     * Queries the admin_users table (RLS allows users to check their own status).
     * @returns {boolean}
     */
    async function isAdmin() {
        const user = await getUser();
        if (!user) return false;

        const { data, error } = await getClient()
            .from('admin_users')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Admin check error:', error.message);
            return false;
        }

        return !!data;
    }

    /**
     * Listen for auth state changes (login, logout, token refresh).
     * @param {Function} callback - receives (event, session)
     */
    function onAuthStateChange(callback) {
        getClient().auth.onAuthStateChange(callback);
    }

    // ── Public API ──
    return {
        signUp,
        signIn,
        signOut,
        getUser,
        getSession,
        isAdmin,
        onAuthStateChange,
    };
})();
