/**
 * tasks.js — Task CRUD Module
 *
 * All task operations go through Supabase (PostgreSQL + RLS).
 * No more localStorage — tasks are stored in the cloud.
 *
 * Depends on: supabase-config.js (must be loaded first)
 */

'use strict';

const Tasks = (() => {
    // ── Get the Supabase client ──
    const getClient = () => window._supabase;

    /**
     * Fetch all tasks for the currently logged-in user.
     * RLS ensures only the user's own tasks are returned.
     * @returns {Array} Array of task objects.
     */
    async function fetchTasks() {
        const { data, error } = await getClient()
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch tasks error:', error.message);
            return [];
        }

        return data || [];
    }

    /**
     * Add a new task for the current user.
     * @param {string} taskName - Name/description of the task.
     * @param {string|null} date - Date in YYYY-MM-DD format, or null.
     * @param {string|null} time - Time in HH:MM format, or null.
     * @returns {Object} { data, error }
     */
    async function addTask(taskName, date, time) {
        // Get the current user's ID
        const { data: { user } } = await getClient().auth.getUser();
        if (!user) return { data: null, error: { message: 'Not logged in' } };

        const { data, error } = await getClient()
            .from('tasks')
            .insert({
                user_id: user.id,
                task_name: taskName,
                date: date || null,
                time: time || null,
                completed: false,
            })
            .select()   // Return the newly created row
            .single();

        if (error) {
            console.error('Add task error:', error.message);
        }

        return { data, error };
    }

    /**
     * Update an existing task.
     * @param {string} id - UUID of the task to update.
     * @param {Object} updates - Fields to update (task_name, date, time, completed).
     * @returns {Object} { data, error }
     */
    async function updateTask(id, updates) {
        const { data, error } = await getClient()
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update task error:', error.message);
        }

        return { data, error };
    }

    /**
     * Delete a task by ID.
     * RLS ensures users can only delete their own tasks.
     * @param {string} id - UUID of the task to delete.
     * @returns {Object} { error }
     */
    async function deleteTask(id) {
        const { error } = await getClient()
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete task error:', error.message);
        }

        return { error };
    }

    /**
     * Toggle the completed status of a task.
     * @param {string} id - UUID of the task.
     * @param {boolean} currentStatus - Current completed value.
     * @returns {Object} { data, error }
     */
    async function toggleTask(id, currentStatus) {
        return updateTask(id, { completed: !currentStatus });
    }

    // ── Public API ──
    return {
        fetchTasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTask,
    };
})();
