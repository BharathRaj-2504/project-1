/**
 * script.js — TaskFlow with Supabase Backend
 *
 * All data stored in Supabase (Postgres + Auth).
 * No custom backend server needed.
 * Deploys as a static site on Vercel.
 */

'use strict';

/* ─────────────────────────────────────────
   1. Supabase Client Setup
───────────────────────────────────────── */

const SUPABASE_URL = 'https://vnlvbccinefgfmiliadg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubHZiY2NpbmVmZ2ZtaWxpYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODMyNTQsImV4cCI6MjA5MTA1OTI1NH0.UJMLcd5pORF-VaY3BuItKD8QvuFyWLg7fzWAGYVDVQk';

// Create the Supabase client instance
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ─────────────────────────────────────────
   2. DOM References
───────────────────────────────────────── */

// Pages
const pageLogin  = document.getElementById('page-login');
const pageSignup = document.getElementById('page-signup');
const pageList   = document.getElementById('page-list');
const pageAdd    = document.getElementById('page-add');
const allPages   = [pageLogin, pageSignup, pageList, pageAdd];

// Login
const loginEmailInput    = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginBtn           = document.getElementById('login-btn');
const loginError         = document.getElementById('login-error');
const goToSignupBtn      = document.getElementById('go-to-signup');

// Signup
const signupEmailInput    = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupConfirmInput  = document.getElementById('signup-confirm');
const signupBtn           = document.getElementById('signup-btn');
const signupError         = document.getElementById('signup-error');
const goToLoginBtn        = document.getElementById('go-to-login');

// Task list header
const userEmailBadge = document.getElementById('user-email-badge');
const goToAddBtn     = document.getElementById('go-to-add');
const logoutBtn      = document.getElementById('logout-btn');

// Task form
const taskNameInput = document.getElementById('task-name');
const taskDateInput = document.getElementById('task-date');
const taskTimeInput = document.getElementById('task-time');
const addBtn        = document.getElementById('add-btn');
const errorMsg      = document.getElementById('error-msg');
const formPageTitle = document.getElementById('form-page-title');
const submitBtnText = document.getElementById('submit-btn-text');
const goToListBtn   = document.getElementById('go-to-list');
const cancelBtn     = document.getElementById('cancel-btn');

// Task list
const taskList   = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');

// Controls
const sortSelect = document.getElementById('sort-select');
const filterBtns = document.querySelectorAll('.filter-btn');

// Stats
const totalCount   = document.getElementById('total-count');
const pendingCount = document.getElementById('pending-count');
const doneCount    = document.getElementById('done-count');
const overdueCount = document.getElementById('overdue-count');

/* ─────────────────────────────────────────
   3. Application State
───────────────────────────────────────── */

let tasks         = [];
let currentFilter = 'all';
let editingTaskId = null;
let currentUser   = null;

/* ─────────────────────────────────────────
   4. Page Navigation
───────────────────────────────────────── */

function showPage(page) {
  allPages.forEach(p => p.classList.add('page-hidden'));
  page.classList.remove('page-hidden');
  page.style.animation = 'none';
  void page.offsetWidth;
  page.style.animation = '';
}

function showLoginPage() {
  clearFormError(loginError);
  loginEmailInput.value = '';
  loginPasswordInput.value = '';
  showPage(pageLogin);
  loginEmailInput.focus();
}

function showSignupPage() {
  clearFormError(signupError);
  signupEmailInput.value = '';
  signupPasswordInput.value = '';
  signupConfirmInput.value = '';
  showPage(pageSignup);
  signupEmailInput.focus();
}

function showListPage() {
  editingTaskId = null;
  taskNameInput.value = '';
  taskDateInput.value = '';
  taskTimeInput.value = '';
  clearFormError(errorMsg);

  if (currentUser) {
    userEmailBadge.textContent = currentUser.email;
  }

  showPage(pageList);
  renderTasks();
}

function showAddPage() {
  editingTaskId = null;
  formPageTitle.textContent = 'New Task';
  submitBtnText.textContent = 'Save Task';
  taskNameInput.value = '';
  taskDateInput.value = '';
  taskTimeInput.value = '';
  setDefaultDate();
  clearFormError(errorMsg);
  showPage(pageAdd);
  taskNameInput.focus();
}

function showEditPage(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  formPageTitle.textContent = 'Edit Task';
  submitBtnText.textContent = 'Update Task';
  taskNameInput.value = task.task_name;
  taskDateInput.value = task.date || '';
  taskTimeInput.value = task.time || '';
  clearFormError(errorMsg);
  showPage(pageAdd);
  taskNameInput.focus();
}

/* ─────────────────────────────────────────
   5. Auth — Signup / Login / Logout
───────────────────────────────────────── */

/** Sign up a new user with Supabase Auth. */
async function handleSignup() {
  const email    = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  const confirm  = signupConfirmInput.value;

  if (!email || !password) {
    return showFormError(signupError, '⚠ Email and password are required.');
  }
  if (password.length < 6) {
    return showFormError(signupError, '⚠ Password must be at least 6 characters.');
  }
  if (password !== confirm) {
    return showFormError(signupError, '⚠ Passwords do not match.');
  }

  try {
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) throw error;

    // Some projects require email confirmation.
    // If the session is returned immediately, the user is logged in.
    if (data.session) {
      currentUser = data.user;
      await fetchTasks();
      showListPage();
    } else {
      // Email confirmation required
      showFormError(signupError, '');
      signupError.textContent = '✓ Check your email to confirm your account, then log in.';
      signupError.classList.add('visible');
      signupError.style.color = 'var(--clr-success)';
      setTimeout(() => { signupError.style.color = ''; }, 5000);
    }

  } catch (err) {
    showFormError(signupError, err.message || 'Signup failed.');
  } finally {
    signupBtn.disabled = false;
    signupBtn.innerHTML = '<span aria-hidden="true">✓</span> Create Account';
  }
}

/** Log in with Supabase Auth. */
async function handleLogin() {
  const email    = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    return showFormError(loginError, '⚠ Email and password are required.');
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;

    currentUser = data.user;
    await fetchTasks();
    showListPage();

  } catch (err) {
    showFormError(loginError, err.message || 'Login failed.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span aria-hidden="true">→</span> Log In';
  }
}

/** Log out and return to the login page. */
async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  tasks = [];
  showLoginPage();
}

/* ─────────────────────────────────────────
   6. Task Data — Supabase CRUD
───────────────────────────────────────── */

/** Fetch all tasks for the current user from Supabase. */
async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error.message);
    tasks = [];
    return;
  }

  tasks = data || [];
}

/** Create a new task in Supabase. */
async function createTask(name, date, time) {
  const { error } = await supabase
    .from('tasks')
    .insert({
      user_id:   currentUser.id,
      task_name: name,
      date:      date || null,
      time:      time || null,
      completed: false,
    });

  if (error) throw error;
}

/** Update an existing task in Supabase. */
async function updateTask(id, updates) {
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

/** Delete a task from Supabase. */
async function deleteTaskFromDB(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/* ─────────────────────────────────────────
   7. Utility Functions
───────────────────────────────────────── */

function isOverdue(task) {
  if (task.completed || !task.date) return false;
  const now = new Date();
  const deadlineStr = task.time
    ? `${task.date}T${task.time}:00`
    : `${task.date}T23:59:59`;
  return new Date(deadlineStr) < now;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm   = String(today.getMonth() + 1).padStart(2, '0');
  const dd   = String(today.getDate()).padStart(2, '0');
  taskDateInput.value = `${yyyy}-${mm}-${dd}`;
}

/* ─────────────────────────────────────────
   8. Sorting & Filtering
───────────────────────────────────────── */

function sortTasks(list) {
  const mode = sortSelect.value;
  return [...list].sort((a, b) => {
    if (mode === 'datetime') {
      const max = new Date(8640000000000000);
      const dtA = a.date ? new Date(`${a.date}T${a.time || '00:00'}`) : max;
      const dtB = b.date ? new Date(`${b.date}T${b.time || '00:00'}`) : max;
      return dtA - dtB;
    }
    if (mode === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (mode === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    return 0;
  });
}

function filterTasks(list) {
  switch (currentFilter) {
    case 'pending':   return list.filter(t => !t.completed && !isOverdue(t));
    case 'completed': return list.filter(t => t.completed);
    case 'overdue':   return list.filter(t => isOverdue(t));
    default:          return list;
  }
}

/* ─────────────────────────────────────────
   9. Stats
───────────────────────────────────────── */

function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(t => isOverdue(t)).length;
  const pending = total - done - overdue;

  totalCount.textContent   = total;
  pendingCount.textContent = Math.max(pending, 0);
  doneCount.textContent    = done;
  overdueCount.textContent = overdue;
}

/* ─────────────────────────────────────────
   10. Render Tasks
───────────────────────────────────────── */

function renderTasks() {
  taskList.innerHTML = '';
  const sorted   = sortTasks(tasks);
  const filtered = filterTasks(sorted);

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  filtered.forEach((task, i) => {
    const li = createTaskElement(task);
    li.style.animationDelay = `${i * 0.05}s`;
    taskList.appendChild(li);
  });

  updateStats();
}

function createTaskElement(task) {
  const overdue   = isOverdue(task);
  const completed = task.completed;

  const li = document.createElement('li');
  li.className = `task-item${completed ? ' completed' : ''}${overdue ? ' overdue' : ''}`;
  li.dataset.id = task.id;

  // Checkbox
  const checkBtn = document.createElement('button');
  checkBtn.className = `task-check${completed ? ' checked' : ''}`;
  checkBtn.setAttribute('aria-label', completed ? 'Mark incomplete' : 'Mark complete');
  checkBtn.addEventListener('click', () => handleToggle(task.id));

  // Body
  const body = document.createElement('div');
  body.className = 'task-body';

  const nameEl = document.createElement('p');
  nameEl.className = 'task-name';
  nameEl.textContent = task.task_name;

  const metaEl = document.createElement('div');
  metaEl.className = 'task-meta';

  if (task.date) {
    const d = document.createElement('span');
    d.className = 'meta-tag';
    d.innerHTML = `<span class="meta-icon">📅</span> ${formatDate(task.date)}`;
    metaEl.appendChild(d);
  }
  if (task.time) {
    const t = document.createElement('span');
    t.className = 'meta-tag';
    t.innerHTML = `<span class="meta-icon">🕐</span> ${formatTime(task.time)}`;
    metaEl.appendChild(t);
  }
  if (overdue) {
    const o = document.createElement('span');
    o.className = 'overdue-badge';
    o.textContent = '⚠ Overdue';
    metaEl.appendChild(o);
  }

  body.appendChild(nameEl);
  body.appendChild(metaEl);

  // Actions
  const actionsEl = document.createElement('div');
  actionsEl.className = 'task-actions';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'btn-action btn-toggle';
  toggleBtn.innerHTML = completed ? '↩' : '✓';
  toggleBtn.addEventListener('click', () => handleToggle(task.id));

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-action btn-edit';
  editBtn.innerHTML = '✏️';
  editBtn.addEventListener('click', () => showEditPage(task.id));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-action btn-delete';
  deleteBtn.innerHTML = '🗑';
  deleteBtn.addEventListener('click', () => handleDelete(task.id));

  actionsEl.appendChild(toggleBtn);
  actionsEl.appendChild(editBtn);
  actionsEl.appendChild(deleteBtn);

  li.appendChild(checkBtn);
  li.appendChild(body);
  li.appendChild(actionsEl);

  return li;
}

/* ─────────────────────────────────────────
   11. Task Action Handlers
───────────────────────────────────────── */

/** Save (create or update) a task. */
async function handleSave() {
  const name = taskNameInput.value.trim();
  const date = taskDateInput.value;
  const time = taskTimeInput.value;

  if (!name) {
    showFormError(errorMsg, '⚠ Please enter a task name.');
    taskNameInput.focus();
    return;
  }
  clearFormError(errorMsg);

  try {
    if (editingTaskId) {
      await updateTask(editingTaskId, { task_name: name, date: date || null, time: time || null });
    } else {
      await createTask(name, date, time);
    }
    await fetchTasks();
    showListPage();
  } catch (err) {
    showFormError(errorMsg, err.message || 'Failed to save task.');
  }
}

/** Toggle task completion. */
async function handleToggle(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  try {
    await updateTask(id, { completed: !task.completed });
    await fetchTasks();
    renderTasks();
  } catch (err) {
    console.error('Toggle failed:', err);
  }
}

/** Delete a task with animation. */
async function handleDelete(id) {
  const li = taskList.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    li.style.opacity = '0';
    li.style.transform = 'translateX(40px) scale(0.95)';
  }

  setTimeout(async () => {
    try {
      await deleteTaskFromDB(id);
      await fetchTasks();
      renderTasks();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, li ? 250 : 0);
}

/* ─────────────────────────────────────────
   12. Error Helpers
───────────────────────────────────────── */

function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.add('visible');
}

function clearFormError(el) {
  el.textContent = '';
  el.classList.remove('visible');
}

/* ─────────────────────────────────────────
   13. Event Listeners
───────────────────────────────────────── */

// Auth navigation
goToSignupBtn.addEventListener('click', showSignupPage);
goToLoginBtn.addEventListener('click', showLoginPage);

// Auth actions
loginBtn.addEventListener('click', handleLogin);
signupBtn.addEventListener('click', handleSignup);
logoutBtn.addEventListener('click', handleLogout);

// Enter key shortcuts
loginPasswordInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
loginEmailInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
signupConfirmInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); });

// Clear errors on typing
loginEmailInput.addEventListener('input', () => clearFormError(loginError));
loginPasswordInput.addEventListener('input', () => clearFormError(loginError));
signupEmailInput.addEventListener('input', () => clearFormError(signupError));
signupPasswordInput.addEventListener('input', () => clearFormError(signupError));
signupConfirmInput.addEventListener('input', () => clearFormError(signupError));

// Task navigation
goToAddBtn.addEventListener('click', showAddPage);
goToListBtn.addEventListener('click', showListPage);
cancelBtn.addEventListener('click', showListPage);

// Task form
addBtn.addEventListener('click', handleSave);
taskNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSave(); });
taskNameInput.addEventListener('input', () => clearFormError(errorMsg));

// Sort & Filter
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
   14. Auto-refresh overdue status
───────────────────────────────────────── */

setInterval(() => {
  if (!pageList.classList.contains('page-hidden')) {
    renderTasks();
  }
}, 60_000);

/* ─────────────────────────────────────────
   15. Initialise — Check if user is already logged in
───────────────────────────────────────── */

(async function init() {
  // Check for an existing Supabase session
  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    currentUser = session.user;
    await fetchTasks();
    showListPage();
  } else {
    showLoginPage();
  }

  // Listen for auth state changes (e.g. tab switch, token refresh)
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      tasks = [];
      showLoginPage();
    }
  });
})();
