/**
 * supabase-config.js — Supabase Client Initialization
 *
 * Creates and exports the Supabase client instance.
 * All other modules import `supabase` from here.
 *
 * The Supabase JS library is loaded via CDN in index.html,
 * which exposes the global `supabase` object on `window`.
 */

'use strict';

// ── Supabase project credentials ──
const SUPABASE_URL = 'https://vnlvbccinefgfmiliadg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubHZiY2NpbmVmZ2ZtaWxpYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODMyNTQsImV4cCI6MjA5MTA1OTI1NH0.UJMLcd5pORF-VaY3BuItKD8QvuFyWLg7fzWAGYVDVQk';

// ── Create the Supabase client ──
// `window.supabase` is provided by the CDN script (@supabase/supabase-js)
const _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// We store it on window so all modules can access it easily
// (since we're not using ES modules / bundler)
window._supabase = _supabaseClient;
