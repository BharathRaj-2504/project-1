/**
 * app.js — Main Application Logic
 *
 * Orchestrates the entire TaskFlow app:
 *  - Auth page (login / signup toggle)
 *  - Task list page (view, filter, sort, stats)
 *  - Add/Edit task page
 *  - Admin dashboard page
 *  - Toast notifications
 *
 * Depends on: supabase-config.js, auth.js, tasks.js, admin.js
 */

'use strict';

/* ─────────────────────────────────────────
   1. DOM References
───────────────────────────────────────── */

// Pages
const pageAuth  = document.getElementById('page-auth');
const pageList  = document.getElementById('page-list');
const pageAdd   = document.getElementById('page-add');
const pageAdmin = document.getElementById('page-admin');

// Auth form elements
const authTitle       = document.getElementById('auth-title');
const authEmail       = document.getElementById('auth-email');
const authPassword    = document.getElementById('auth-password');
const authSubmitBtn   = document.getElementById('auth-submit-btn');
const authSubmitText  = document.getElementById('auth-submit-text');
const authToggleBtn   = document.getElementById('auth-toggle-btn');
const authToggleText  = document.getElementById('auth-toggle-text');
const authError       = document.getElementById('auth-error');
const authLoading     = document.getElementById('auth-loading');

// Header elements
const logoutBtn       = document.getElementById('logout-btn');
const adminNavBtn     = document.getElementById('admin-nav-btn');
const userEmailDisplay = document.getElementById('user-email-display');

// Navigation buttons
const goToAddBtn  = document.getElementById('go-to-add');
const goToListBtn = document.getElementById('go-to-list');
const cancelBtn   = document.getElementById('cancel-btn');
const adminBackBtn = document.getElementById('admin-back-btn');

// Form elements
const taskNameInput  = document.getElementById('task-name');
const taskDateInput  = document.getElementById('task-date');
const taskTimeInput  = document.getElementById('task-time');
const addBtn         = document.getElementById('add-btn');
const errorMsg       = document.getElementById('error-msg');
const formPageTitle  = document.getElementById('form-page-title');
const submitBtnText  = document.getElementById('submit-btn-text');

// Task list area
const taskList   = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');

// Controls
const sortSelect = document.getElementById('sort-select');
const filterBtns = document.querySelectorAll('.filter-btn');

// Stats counters
const totalCount   = document.getElementById('total-count');
const pendingCount = document.getElementById('pending-count');
const doneCount    = document.getElementById('done-count');
const overdueCount = document.getElementById('overdue-count');

// Toast
const toastEl = document.getElementById('toast');

/* ─────────────────────────────────────────
   2. Application State
───────────────────────────────────────── */

let tasks = [];               // Array of task objects from Supabase
let currentFilter = 'all';    // Active filter tab
let editingTaskId = null;     // ID of task being edited (null = add mode)
let isAuthModeLogin = true;   // true = Login, false = Sign Up
let currentUserIsAdmin = false;

/* ─────────────────────────────────────────
   3. Toast Notifications
───────────────────────────────────────── */

let toastTimeout = null;

/**
 * Show a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - The toast type.
 */
function showToast(message, type = 'info') {
    toastEl.textContent = message;
    toastEl.className = `toast toast-${type} toast-visible`;

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('toast-visible');
    }, 3500);
}

/* ─────────────────────────────────────────
   4. Page Navigation
───────────────────────────────────────── */

/** Hide all pages */
function hideAllPages() {
    [pageAuth, pageList, pageAdd, pageAdmin].forEach(p => p.classList.add('page-hidden'));
}

/** Show the Auth page */
function showAuthPage() {
    hideAllPages();
    pageAuth.classList.remove('page-hidden');
    reanimPage(pageAuth);
    // Reset auth form
    authEmail.value = '';
    authPassword.value = '';
    clearAuthError();
    setAuthMode(true); // default to login
    // Hide header nav elements when on auth page
    logoutBtn.style.display = 'none';
    adminNavBtn.style.display = 'none';
    userEmailDisplay.style.display = 'none';
}

/** Show the Task List page */
async function showListPage() {
    editingTaskId = null;
    hideAllPages();
    pageList.classList.remove('page-hidden');
    reanimPage(pageList);

    // Show header elements
    logoutBtn.style.display = '';
    userEmailDisplay.style.display = '';
    adminNavBtn.style.display = currentUserIsAdmin ? '' : 'none';

    // Reset form
    taskNameInput.value = '';
    taskDateInput.value = '';
    taskTimeInput.value = '';
    clearError();

    await loadAndRenderTasks();
}

/** Show the Add Task page (fresh/empty form) */
function showAddPage() {
    editingTaskId = null;
    formPageTitle.textContent = 'New Task';
    submitBtnText.textContent = 'Save Task';

    taskNameInput.value = '';
    taskDateInput.value = '';
    taskTimeInput.value = '';
    setDefaultDate();
    clearError();

    hideAllPages();
    pageAdd.classList.remove('page-hidden');
    reanimPage(pageAdd);

    // Keep header elements visible
    logoutBtn.style.display = '';
    userEmailDisplay.style.display = '';
    adminNavBtn.style.display = currentUserIsAdmin ? '' : 'none';

    taskNameInput.focus();
}

/** Show the Edit Task page (pre-filled with existing data) */
function showEditPage(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    formPageTitle.textContent = 'Edit Task';
    submitBtnText.textContent = 'Update Task';

    taskNameInput.value = task.task_name;
    taskDateInput.value = task.date || '';
    taskTimeInput.value = task.time || '';
    clearError();

    hideAllPages();
    pageAdd.classList.remove('page-hidden');
    reanimPage(pageAdd);

    logoutBtn.style.display = '';
    userEmailDisplay.style.display = '';
    adminNavBtn.style.display = currentUserIsAdmin ? '' : 'none';

    taskNameInput.focus();
}

/** Show the Admin Dashboard page */
async function showAdminPage() {
    hideAllPages();
    pageAdmin.classList.remove('page-hidden');
    reanimPage(pageAdmin);

    logoutBtn.style.display = '';
    userEmailDisplay.style.display = '';
    adminNavBtn.style.display = 'none'; // hide admin btn when on admin page

    await Admin.renderDashboard();
}

/** Replay the page-in animation on a page element */
function reanimPage(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
}

/* ─────────────────────────────────────────
   5. Auth UI Logic
───────────────────────────────────────── */

/** Switch between Login and Sign Up mode */
function setAuthMode(isLogin) {
    isAuthModeLogin = isLogin;
    authTitle.textContent = isLogin ? 'Welcome Back' : 'Create Account';
    authSubmitText.textContent = isLogin ? 'Sign In' : 'Sign Up';
    authToggleText.innerHTML = isLogin
        ? "Don't have an account? <strong>Sign Up</strong>"
        : "Already have an account? <strong>Sign In</strong>";
    clearAuthError();
}

/** Handle auth form submission */
async function handleAuthSubmit() {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    // Validation
    if (!email || !password) {
        showAuthError('Please enter both email and password.');
        return;
    }
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters.');
        return;
    }

    // Show loading
    setAuthLoading(true);
    clearAuthError();

    if (isAuthModeLogin) {
        // ── LOGIN ──
        const { data, error } = await Auth.signIn(email, password);
        setAuthLoading(false);

        if (error) {
            showAuthError(error.message);
            return;
        }

        showToast('Welcome back! 👋', 'success');
        await initApp();
    } else {
        // ── SIGNUP ──
        const { data, error } = await Auth.signUp(email, password);
        setAuthLoading(false);

        if (error) {
            showAuthError(error.message);
            return;
        }

        showToast('Account created successfully! 🎉', 'success');
        await initApp();
    }
}

function showAuthError(msg) {
    authError.textContent = msg;
    authError.classList.add('visible');
}

function clearAuthError() {
    authError.textContent = '';
    authError.classList.remove('visible');
}

function setAuthLoading(loading) {
    authSubmitBtn.disabled = loading;
    authLoading.style.display = loading ? 'block' : 'none';
    authSubmitText.style.opacity = loading ? '0.5' : '1';
}

/* ─────────────────────────────────────────
   6. Utility Functions
───────────────────────────────────────── */

/** Check if a task is overdue (not completed, date has passed) */
function isOverdue(task) {
    if (task.completed || !task.date) return false;
    const now = new Date();
    const deadlineStr = task.time
        ? `${task.date}T${task.time}`
        : `${task.date}T23:59:59`;
    return new Date(deadlineStr) < now;
}

/** Format YYYY-MM-DD to human readable */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
}

/** Format HH:MM to 12h AM/PM */
function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Pre-fill the date input with today */
function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    taskDateInput.value = `${yyyy}-${mm}-${dd}`;
}

/* ─────────────────────────────────────────
   7. Sorting & Filtering
───────────────────────────────────────── */

/** Sort tasks */
function sortTasks(list) {
    const mode = sortSelect.value;
    return [...list].sort((a, b) => {
        if (mode === 'datetime') {
            const maxDate = new Date(8640000000000000);
            const dtA = a.date ? new Date(`${a.date}T${a.time || '00:00'}`) : maxDate;
            const dtB = b.date ? new Date(`${b.date}T${b.time || '00:00'}`) : maxDate;
            return dtA - dtB;
        }
        if (mode === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (mode === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        return 0;
    });
}

/** Filter tasks */
function filterTasks(list) {
    switch (currentFilter) {
        case 'pending':   return list.filter(t => !t.completed && !isOverdue(t));
        case 'completed': return list.filter(t => t.completed);
        case 'overdue':   return list.filter(t => isOverdue(t));
        default:          return list;
    }
}

/* ─────────────────────────────────────────
   8. Stats Update
───────────────────────────────────────── */

function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => isOverdue(t)).length;
    const pending = total - done - overdue;

    totalCount.textContent = total;
    pendingCount.textContent = Math.max(pending, 0);
    doneCount.textContent = done;
    overdueCount.textContent = overdue;
}

/* ─────────────────────────────────────────
   9. Render Tasks
───────────────────────────────────────── */

/** Load tasks from Supabase and render */
async function loadAndRenderTasks() {
    tasks = await Tasks.fetchTasks();
    renderTasks();
}

/** Render the task list (using current in-memory tasks) */
function renderTasks() {
    taskList.innerHTML = '';

    const sorted = sortTasks(tasks);
    const filtered = filterTasks(sorted);

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    filtered.forEach((task, index) => {
        const li = createTaskElement(task);
        li.style.animationDelay = `${index * 0.05}s`;
        taskList.appendChild(li);
    });

    updateStats();
}

/** Build a <li> element for a single task */
function createTaskElement(task) {
    const overdue = isOverdue(task);
    const completed = task.completed;

    const li = document.createElement('li');
    li.className = `task-item${completed ? ' completed' : ''}${overdue ? ' overdue' : ''}`;
    li.dataset.id = task.id;

    // ── Checkbox ──
    const checkBtn = document.createElement('button');
    checkBtn.className = `task-check${completed ? ' checked' : ''}`;
    checkBtn.setAttribute('aria-label', completed ? 'Mark as incomplete' : 'Mark as complete');
    checkBtn.setAttribute('title', completed ? 'Mark as incomplete' : 'Mark as complete');
    checkBtn.addEventListener('click', () => handleToggleTask(task.id, task.completed));

    // ── Body ──
    const body = document.createElement('div');
    body.className = 'task-body';

    const nameEl = document.createElement('p');
    nameEl.className = 'task-name';
    nameEl.textContent = task.task_name;

    const metaEl = document.createElement('div');
    metaEl.className = 'task-meta';

    if (task.date) {
        const dateBadge = document.createElement('span');
        dateBadge.className = 'meta-tag';
        dateBadge.innerHTML = `<span class="meta-icon">📅</span> ${formatDate(task.date)}`;
        metaEl.appendChild(dateBadge);
    }

    if (task.time) {
        const timeBadge = document.createElement('span');
        timeBadge.className = 'meta-tag';
        timeBadge.innerHTML = `<span class="meta-icon">🕐</span> ${formatTime(task.time)}`;
        metaEl.appendChild(timeBadge);
    }

    if (overdue) {
        const overdueBadge = document.createElement('span');
        overdueBadge.className = 'overdue-badge';
        overdueBadge.textContent = '⚠ Overdue';
        metaEl.appendChild(overdueBadge);
    }

    body.appendChild(nameEl);
    body.appendChild(metaEl);

    // ── Actions ──
    const actionsEl = document.createElement('div');
    actionsEl.className = 'task-actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-action btn-toggle';
    toggleBtn.innerHTML = completed ? '↩' : '✓';
    toggleBtn.setAttribute('aria-label', completed ? 'Undo completion' : 'Complete task');
    toggleBtn.setAttribute('title', completed ? 'Undo completion' : 'Complete task');
    toggleBtn.addEventListener('click', () => handleToggleTask(task.id, task.completed));

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-action btn-edit';
    editBtn.innerHTML = '✏️';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.setAttribute('title', 'Edit task');
    editBtn.addEventListener('click', () => showEditPage(task.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-action btn-delete';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.setAttribute('title', 'Delete task');
    deleteBtn.addEventListener('click', () => handleDeleteTask(task.id));

    actionsEl.appendChild(toggleBtn);
    actionsEl.appendChild(editBtn);
    actionsEl.appendChild(deleteBtn);

    li.appendChild(checkBtn);
    li.appendChild(body);
    li.appendChild(actionsEl);

    return li;
}

/* ─────────────────────────────────────────
   10. Task Actions (Add / Update / Toggle / Delete)
───────────────────────────────────────── */

/** Save or update a task via Supabase */
async function saveTask() {
    const name = taskNameInput.value.trim();
    const date = taskDateInput.value;
    const time = taskTimeInput.value;

    if (!name) {
        showError('⚠ Please enter a task name.');
        taskNameInput.focus();
        return;
    }

    clearError();

    if (editingTaskId) {
        // ── UPDATE ──
        const { error } = await Tasks.updateTask(editingTaskId, {
            task_name: name,
            date: date || null,
            time: time || null,
        });

        if (error) {
            showToast('Failed to update task.', 'error');
            return;
        }

        showToast('Task updated ✏️', 'success');
    } else {
        // ── ADD ──
        const { error } = await Tasks.addTask(name, date, time);

        if (error) {
            showToast('Failed to add task.', 'error');
            return;
        }

        showToast('Task added! 🎯', 'success');
    }

    await showListPage();
}

/** Toggle completed status via Supabase */
async function handleToggleTask(id, currentStatus) {
    const { error } = await Tasks.toggleTask(id, currentStatus);

    if (error) {
        showToast('Failed to update task.', 'error');
        return;
    }

    // Update local state for instant feedback
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !currentStatus } : t);
    renderTasks();
    showToast(currentStatus ? 'Task reopened' : 'Task completed! ✓', 'success');
}

/** Delete a task via Supabase with animation */
async function handleDeleteTask(id) {
    const li = taskList.querySelector(`[data-id="${id}"]`);

    if (li) {
        li.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        li.style.opacity = '0';
        li.style.transform = 'translateX(40px) scale(0.95)';
    }

    setTimeout(async () => {
        const { error } = await Tasks.deleteTask(id);

        if (error) {
            showToast('Failed to delete task.', 'error');
            return;
        }

        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
        showToast('Task deleted 🗑', 'info');
    }, 250);
}

/** Handle logout */
async function handleLogout() {
    const { error } = await Auth.signOut();
    if (error) {
        showToast('Logout failed.', 'error');
        return;
    }
    tasks = [];
    currentUserIsAdmin = false;
    showAuthPage();
    showToast('Logged out successfully.', 'info');
}

/* ─────────────────────────────────────────
   11. Error Messaging (task form)
───────────────────────────────────────── */

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
}

function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
}

/* ─────────────────────────────────────────
   12. Event Listeners
───────────────────────────────────────── */

// ── Auth ──
authSubmitBtn.addEventListener('click', handleAuthSubmit);
authToggleBtn.addEventListener('click', () => setAuthMode(!isAuthModeLogin));
authEmail.addEventListener('keydown', (e) => { if (e.key === 'Enter') authPassword.focus(); });
authPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAuthSubmit(); });

// ── Navigation ──
goToAddBtn.addEventListener('click', showAddPage);
goToListBtn.addEventListener('click', showListPage);
cancelBtn.addEventListener('click', showListPage);
logoutBtn.addEventListener('click', handleLogout);
adminNavBtn.addEventListener('click', showAdminPage);
adminBackBtn.addEventListener('click', showListPage);

// ── Form ──
addBtn.addEventListener('click', saveTask);
taskNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveTask(); });
taskNameInput.addEventListener('input', clearError);

// ── Sort & Filter ──
sortSelect.addEventListener('change', renderTasks);
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

/* ─────────────────────────────────────────
   13. Auto-refresh Overdue Status
───────────────────────────────────────── */

setInterval(() => {
    if (!pageList.classList.contains('page-hidden')) {
        renderTasks();
    }
}, 60_000);

/* ─────────────────────────────────────────
   14. App Initialization
───────────────────────────────────────── */

/**
 * Initialize the app:
 * - Check if user has an active session
 * - If yes → show task list
 * - If no → show auth page
 */
async function initApp() {
    const session = await Auth.getSession();

    if (session && session.user) {
        // User is logged in
        userEmailDisplay.textContent = session.user.email;

        // Check admin status
        currentUserIsAdmin = await Auth.isAdmin();

        await showListPage();
    } else {
        // No session — show login
        showAuthPage();
    }
}

// ── Start the app ──
initApp();
