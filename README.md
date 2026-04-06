# 🚀 TaskFlow – Full Stack To-Do App

A modern full-stack To-Do List web application built using **HTML, CSS, JavaScript, Supabase, and Vercel**.

This project upgrades a basic localStorage-based to-do app into a **secure, scalable, real-world application** with authentication, database integration, and an admin dashboard.

---

## ✨ Features

### 🔐 Authentication

* User Signup & Login (Email + Password)
* Secure authentication using Supabase Auth
* Persistent sessions

### 📝 Task Management

* Add tasks with date and time
* Edit tasks
* Mark tasks as completed
* Delete tasks
* Tasks persist in database (not localStorage)

### 👤 User System

* Each user can only see their own tasks
* Secure access using Row Level Security (RLS)

### 👑 Admin Dashboard

* View all registered users
* View all tasks from all users
* Role-based access control

---

## 🛠️ Tech Stack

### Frontend

* HTML
* CSS
* JavaScript (Vanilla)

### Backend / Database

* Supabase (PostgreSQL + Auth + RLS)

### Deployment

* Vercel

---

## 📁 Project Structure

```
Project-1/
│
├── index.html
├── style.css
├── js/
│   ├── supabase-config.js
│   ├── auth.js
│   ├── tasks.js
│   ├── admin.js
│   └── app.js
│
├── sql/
│   └── setup.sql
│
└── vercel.json
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

---

### 2. Setup Supabase

1. Create a project in Supabase
2. Go to **SQL Editor**
3. Run the SQL from `sql/setup.sql`

---

### 3. Configure Supabase in frontend

In `supabase-config.js`:

```javascript
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_ANON_KEY";
```

---

### 4. Run the project

Just open:

```bash
index.html
```

Or use Live Server (recommended)

---

### 5. Deploy on Vercel

* Push your project to GitHub
* Import into Vercel
* Deploy 🚀

---

## 🔐 Admin Setup

After signing up, run this SQL in Supabase:

```sql
insert into admin_users (user_id)
values (
  (select id from auth.users where email = 'your-email@example.com')
);
```

---

## 🔒 Security Features

* Passwords handled securely via Supabase Auth
* Row Level Security (RLS) enabled
* Users can only access their own data
* Admin access controlled via database roles

---

## 🚧 Future Improvements

* Email verification
* Password reset feature
* Better UI/UX (animations, themes)
* Mobile responsiveness improvements
* Notifications & reminders
* AI-based task suggestions 🤖

---

## 🌐 Live Demo

👉 (https://taskflow-smart-todolist.vercel.app/)

---

## 🙌 Acknowledgements

* Supabase for backend services
* Vercel for deployment

---

## 📌 Author

**Bharath Raj**

* Passionate about full-stack development & problem solving
* Currently learning DSA and building real-world projects

---

## ⭐ If you like this project

Give it a star ⭐ on GitHub and share it!

---
