import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';
import { SplashScreen, TopProgressBar } from './components/ui/loading';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';
import TeacherLayout from './layouts/TeacherLayout';
import StudentLayout from './layouts/StudentLayout';

// Shared
import ProtectedRoute from './components/shared/ProtectedRoute';
import NoticeBoard from './pages/shared/NoticeBoard';
import ManageNotices from './pages/shared/ManageNotices';

// Auth pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ChangePassword from './pages/auth/ChangePassword';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import Departments from './pages/admin/Departments';
import DepartmentDetails from './pages/admin/DepartmentDetails';
import DeptStaff from './pages/admin/DeptStaff';
import UserManagement from './pages/admin/UserManagement';
import AdminNotifications from './pages/admin/Notifications';
import AdminBroadcast from './pages/admin/Broadcast';
import AdminSettings from './pages/admin/Settings';

// Staff pages
import StaffDashboard from './pages/staff/Dashboard';
import StaffTeachers from './pages/staff/Teachers';
import StaffStudents from './pages/staff/Students';
import StaffCourses from './pages/staff/Courses';
import Semesters from './pages/staff/Semesters';
import CourseOfferings from './pages/staff/CourseOfferings';
import GradeEntry from './pages/staff/GradeEntry';
import StaffGradeReview from './pages/staff/GradeReview';
import StaffResultsDashboard from './pages/staff/ResultsDashboard';
import StaffMarksEntry from './pages/staff/StaffMarksEntry';
import Enrollments from './pages/staff/Enrollments';
import BulkUpload from './pages/staff/BulkUpload';
import Reports from './pages/staff/Reports';
import Fees from './pages/staff/Fees';
import Payments from './pages/staff/Payments';
import StaffNotifications from './pages/staff/Notifications';
import HistoricalData from './pages/staff/HistoricalData';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherMyCourses from './pages/teacher/MyCourses';
import TeacherCourseDetails from './pages/teacher/CourseDetails';
import TeacherCourseMarks from './pages/teacher/CourseMarks';
import TeacherProfile from './pages/teacher/Profile';
import TeacherNotifications from './pages/teacher/Notifications';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import Registration from './pages/student/Registration';
import RetakeImprove from './pages/student/RetakeImprove';
import Payment from './pages/student/Payment';
import PaymentHistory from './pages/student/PaymentHistory';
import StudentMyCourses from './pages/student/MyCourses';
import Transcript from './pages/student/Transcript';
import StudentProfile from './pages/student/Profile';
import StudentNotifications from './pages/student/Notifications';
import ResultBoardSelection from './pages/student/ResultBoardSelection';
import ResultBoard from './pages/student/ResultBoard';
import StudentIndividualResult from './pages/student/StudentIndividualResult';

// Domain
import TourManager from './components/domain/TourManager';



const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="notices" element={<ManageNotices isDeptStaff={false} />} />
          <Route path="departments" element={<Departments />} />
          <Route path="departments/:id" element={<DepartmentDetails />} />
          <Route path="staff" element={<DeptStaff />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="broadcast" element={<AdminBroadcast />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Staff */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['dept_staff']}><StaffLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="notices" element={<ManageNotices isDeptStaff={true} />} />
          <Route path="notice-board" element={<NoticeBoard />} />
          <Route path="teachers" element={<StaffTeachers />} />
          <Route path="students" element={<StaffStudents />} />
          <Route path="courses" element={<StaffCourses />} />
          <Route path="semesters" element={<Semesters />} />
          <Route path="grades/:semesterId/results" element={<StaffResultsDashboard />} />
          <Route path="marks/:semesterId/:offeringId" element={<StaffMarksEntry />} />
          <Route path="offerings" element={<CourseOfferings />} />
          <Route path="historical-data" element={<HistoricalData />} />
          <Route path="grades" element={<GradeEntry />} />
          <Route path="grades/:offeringId" element={<StaffGradeReview />} />
          <Route path="enrollments" element={<Enrollments />} />
          <Route path="bulk-upload" element={<BulkUpload />} />
          <Route path="reports/*" element={<Reports />} />
          <Route path="fees" element={<Fees />} />
          <Route path="payments" element={<Payments />} />
          <Route path="notifications" element={<StaffNotifications />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Teacher */}
        <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="notices" element={<NoticeBoard />} />
          <Route path="courses" element={<TeacherMyCourses />} />
          <Route path="courses/:id" element={<TeacherCourseDetails />} />
          <Route path="courses/:offeringId/marks" element={<TeacherCourseMarks />} />
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="notifications" element={<TeacherNotifications />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Student */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="notices" element={<NoticeBoard />} />
          <Route path="registration" element={<Registration />} />
          <Route path="retake-improvement" element={<RetakeImprove />} />
          <Route path="payment" element={<Payment />} />
          <Route path="payment/history" element={<PaymentHistory />} />
          <Route path="my-courses" element={<StudentMyCourses />} />
          <Route path="transcript" element={<Transcript />} />
          <Route path="results/board" element={<ResultBoardSelection />} />
          <Route path="results/individual/:semesterId" element={<StudentIndividualResult />} />
          <Route path="results/board/:semesterId" element={<ResultBoard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="notifications" element={<StudentNotifications />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => { 
    checkAuth().finally(() => {
      setTimeout(() => setAppReady(true), 1500);
    });
  }, []);

  if (!appReady) return <SplashScreen />;

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontFamily: 'DM Sans', borderRadius: '10px' } }} />
      <TopProgressBar />
      <TourManager />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
