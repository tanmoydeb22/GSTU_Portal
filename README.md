# GSTU Portal — Course Registration System
Gopalganj Science & Technology University

## Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: Node.js + Express + MySQL
- Auth: JWT (4 roles: admin, dept_staff, teacher, student)

## Setup Instructions

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

### Database Setup
```bash
mysql -u root -p < database/gstuportal_FINAL.sql
# Then replace PLACEHOLDER hashes (see SQL file)
```

## Default Credentials (after setup)
Admin: admin@gstuportal.com / Admin@1234
Dept Staff: created by admin
Teacher: teacher_code / Teacher@123
Student: added via bulk upload

## Features
- Course registration
- Grade management
- Result publication
- Payment system (ShurjoPay)
- PDF transcript & ID card generation
- Retake/Improvement system
- Real-time notifications
