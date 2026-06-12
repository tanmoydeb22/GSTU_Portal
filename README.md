# 🎓 GSTU Portal — Comprehensive University Management System

Welcome to the **GSTU Portal**! This is a complete, full-stack Course Registration and University Management System designed originally for Gopalganj Science & Technology University (GSTU). It digitizes the entire academic workflow—from student enrollment and course registration to grade submission, result publication, and transcript generation.

---

## ✨ Features by Role

The system is built with a robust Role-Based Access Control (RBAC) architecture, supporting four distinct user roles:

### 🛡️ System Admin
- **Dashboard Overview:** Monitor university-wide statistics (total students, active teachers, departments).
- **User Management:** Create, update, and manage credentials for Section Officers and Teachers.
- **Academic Structure:** Manage Faculties, Departments, and System Settings.
- **Broadcast Notifications:** Send real-time announcements to the entire university.

### 🏢 Section Officer (Department Admin)
- **Student Management:** Bulk import students via CSV, auto-generate credentials, and manage profiles.
- **Semester & Course Logistics:** Create semesters, design course curriculums, and assign teachers to course offerings.
- **Result Processing:** Review grades submitted by teachers, process results, and publish the final Result Boards.
- **Payment & Fees:** Configure semester fees, verify manual payment receipts, and manage digital payments.
- **Automated Reporting:** Generate deep insights, failure rate reports, and performance trend analytics.

### 👨‍🏫 Teacher
- **Interactive Dashboard:** View weekly class schedules with room allocations.
- **Grade Management:** View enrolled students, input grades (continuous assessment & finals), and submit them to the Section Officer.
- **Profile Management:** Update contact information, research interests, and manage account security.

### 👨‍🎓 Student
- **Course Registration:** View available courses and register for new semesters.
- **Retake & Improvement:** Automatically identifies eligible courses for retakes or grade improvements.
- **Payment Integration:** Securely pay semester fees via integrated digital payment gateways (e.g., bKash, Nagad) or upload manual bank receipts.
- **Academic Tracking:** View real-time CGPA, published results, and graduation progress.
- **Document Generation:** Automatically generate and download official Transcripts and ID Cards as PDFs.

---

## 🛠️ Technology Stack

**Frontend:**
- React 18 (Vite)
- Tailwind CSS for modern, responsive UI
- Zustand (State Management)
- Socket.io-client (Real-time notifications)
- React Router DOM (Navigation)

**Backend:**
- Node.js & Express.js
- MySQL 8.0 (Relational Database)
- JWT (JSON Web Tokens) for secure Authentication
- Socket.io (WebSocket server)
- Multer (File uploads) & PDFKit (PDF generation)

---

## 🚀 Getting Started (Local Setup)

Want to run the GSTU Portal locally or contribute? Follow these steps!

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MySQL** (v8.0 or higher)
- **Git**

### 2. Database Setup
First, log in to your MySQL server and create an empty database:
```sql
CREATE DATABASE gstu_portal;
```

Then, import the schema and seed data to set up the tables and initial configurations:
```bash
cd backend
mysql -u root -p gstu_portal < schema.sql
mysql -u root -p gstu_portal < seed.sql
```

### 3. Backend Setup
Navigate to the backend directory, install dependencies, and configure the environment:
```bash
cd backend
npm install

# Copy the example environment file
cp .env.example .env
```
Open the newly created `.env` file and update your MySQL database credentials (`DB_USER`, `DB_PASS`, `DB_NAME`). Then, start the server:
```bash
npm run dev
```

### 4. Frontend Setup
Navigate to the frontend directory, install dependencies, and configure the environment:
```bash
cd ../frontend
npm install

# Copy the example environment file
cp .env.example .env
```
*(By default, the frontend expects the backend to run on `http://localhost:5001`. If you changed the backend port, update `VITE_API_URL` in the frontend's `.env` file).*

Start the frontend development server:
```bash
npm run dev
```

---

## 🔑 Default Credentials

Once the system is running and the database is seeded, you can log in using the following test accounts:

- **System Admin:** `admin@gstuportal.com` / `Admin@1234`
- **Section Officer:** *Log in as Admin to create a Section Officer account.*
- **Teacher:** *Log in as Admin or Section Officer to create a Teacher account.*
- **Student:** *Log in as a Section Officer to bulk upload or manually create Student accounts.*

---

## 🤝 Open Source & Contributions

This project is open-source! To allow others to use and contribute to it:
1. **Visibility:** Make sure this repository is set to **Public** in your GitHub repository settings.
2. **Fork & Clone:** Users can simply hit the **"Fork"** button at the top right of this page to copy the project to their own GitHub account, and clone it from there!
3. **Pull Requests:** If you find bugs or want to add features, feel free to open a Pull Request!

---
*Developed for Gopalganj Science & Technology University.*
