/**
 * admin.js — Admin Dashboard Module
 *
 * Admin users can view all users and all tasks across the platform.
 * Uses SECURITY DEFINER database functions that verify admin status.
 *
 * Depends on: supabase-config.js, auth.js (must be loaded first)
 */

'use strict';

const Admin = (() => {
    // ── Get the Supabase client ──
    const getClient = () => window._supabase;

    /**
     * Fetch all users (admin only).
     * Calls the get_all_users() database function.
     * @returns {Array} Array of user objects with task counts.
     */
    async function fetchAllUsers() {
        const { data, error } = await getClient().rpc('get_all_users');

        if (error) {
            console.error('Fetch all users error:', error.message);
            return [];
        }

        return data || [];
    }

    /**
     * Fetch all tasks from all users (admin only).
     * Calls the get_all_tasks() database function.
     * @returns {Array} Array of task objects with user email.
     */
    async function fetchAllTasks() {
        const { data, error } = await getClient().rpc('get_all_tasks');

        if (error) {
            console.error('Fetch all tasks error:', error.message);
            return [];
        }

        return data || [];
    }

    /**
     * Render the admin dashboard.
     * Fetches users and tasks, then populates the admin page.
     */
    async function renderDashboard() {
        const adminUsersBody = document.getElementById('admin-users-body');
        const adminTasksBody = document.getElementById('admin-tasks-body');
        const adminUserCount = document.getElementById('admin-user-count');
        const adminTaskCount = document.getElementById('admin-task-count');

        // Show loading state
        adminUsersBody.innerHTML = '<tr><td colspan="4" class="table-loading">Loading users…</td></tr>';
        adminTasksBody.innerHTML = '<tr><td colspan="6" class="table-loading">Loading tasks…</td></tr>';

        // Fetch data in parallel
        const [users, tasks] = await Promise.all([
            fetchAllUsers(),
            fetchAllTasks(),
        ]);

        // ── Render user stats ──
        adminUserCount.textContent = users.length;
        adminTaskCount.textContent = tasks.length;

        // ── Render users table ──
        if (users.length === 0) {
            adminUsersBody.innerHTML = '<tr><td colspan="4" class="table-empty">No users found</td></tr>';
        } else {
            adminUsersBody.innerHTML = users.map(user => `
                <tr>
                    <td class="td-email">${escapeHtml(user.email)}</td>
                    <td>${formatAdminDate(user.created_at)}</td>
                    <td>${user.last_sign_in_at ? formatAdminDate(user.last_sign_in_at) : 'Never'}</td>
                    <td><span class="admin-badge">${user.task_count}</span></td>
                </tr>
            `).join('');
        }

        // ── Render tasks table ──
        if (tasks.length === 0) {
            adminTasksBody.innerHTML = '<tr><td colspan="6" class="table-empty">No tasks found</td></tr>';
        } else {
            adminTasksBody.innerHTML = tasks.map(task => `
                <tr>
                    <td class="td-email">${escapeHtml(task.user_email)}</td>
                    <td>${escapeHtml(task.task_name)}</td>
                    <td>${task.date || '—'}</td>
                    <td>${task.time ? formatAdminTime(task.time) : '—'}</td>
                    <td>
                        <span class="status-pill ${task.completed ? 'status-done' : 'status-pending'}">
                            ${task.completed ? '✓ Done' : '◦ Pending'}
                        </span>
                    </td>
                    <td>${formatAdminDate(task.created_at)}</td>
                </tr>
            `).join('');
        }
    }

    // ── Helper: escape HTML to prevent XSS ──
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Helper: format datetime for admin tables ──
    function formatAdminDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    }

    // ── Helper: format time for admin tables ──
    function formatAdminTime(timeStr) {
        if (!timeStr) return '—';
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${period}`;
    }

    // ── Public API ──
    return {
        fetchAllUsers,
        fetchAllTasks,
        renderDashboard,
    };
})();
