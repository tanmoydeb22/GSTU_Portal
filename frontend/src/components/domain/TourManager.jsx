import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import useAuthStore from '../../store/useAuthStore';

export default function TourManager() {
  const { user, role, completeTour } = useAuthStore();
  const driverObj = useRef(null);

  useEffect(() => {
    if (!user) return;

    let steps = [];

    if (role === 'student') {
      steps = [
        { element: '.dashboard-header', popover: { title: 'Welcome to GSTU Portal! 👋', description: 'This is your academic dashboard. Let\'s take a quick tour to get you started.', side: 'bottom', align: 'start' } },
        { element: '.stats-cards', popover: { title: 'Your Academic Summary', description: 'Track your CGPA, completed credits, and current level/term at a glance.', side: 'top', align: 'start' } },
        { element: '.sidebar-nav', popover: { title: 'Navigation Menu', description: 'Access all portal features from here — Registration, Results, Payment, and more.', side: 'right', align: 'start' } },
        { element: '[href="/student/registration"]', popover: { title: '📝 Course Registration', description: 'Click here during the registration window to enroll in your courses for the semester.', side: 'right', align: 'center' } },
        { element: '[href="/student/retake-improvement"]', popover: { title: '🔄 Retake & Improvement', description: 'Have failed courses? Or want to improve your grade? Register here for retake or improvement.', side: 'right', align: 'center' } },
        { element: '[href="/student/payment"]', popover: { title: '💳 Fee Payment', description: 'After your department closes registration, pay your semester fee here securely via ShurjoPay.', side: 'right', align: 'center' } },
        { element: '[href="/student/transcript"]', popover: { title: '📊 Academic Transcript', description: 'View all your past results, semester GPAs, and overall CGPA. You can also download your official transcript.', side: 'right', align: 'center' } },
        { element: '.active-semester-card', popover: { title: '📅 Active Registration', description: 'When registration is open, you\'ll see the deadline countdown here. Don\'t miss it!', side: 'top', align: 'center' } },
        { popover: { title: 'You\'re All Set! 🎉', description: 'That\'s the full tour. If you need help, contact your department office. Good luck!' } }
      ];
    } else if (role === 'dept_staff') {
      steps = [
        { popover: { title: 'Welcome to Section Officer Desk 👋', description: 'Let\'s explore your department management tools.' } },
        { element: '[href="/staff/students"]', popover: { title: 'Students Directory', description: 'Manage and view all students in your department.', side: 'right', align: 'center' } },
        { element: '[href="/staff/courses"]', popover: { title: 'Course Catalog', description: 'View and edit the department\'s course catalog.', side: 'right', align: 'center' } },
        { element: '[href="/staff/semesters"]', popover: { title: 'Semester Setup', description: 'Create and activate new semesters here.', side: 'right', align: 'center' } },
        { element: '[href="/staff/offerings"]', popover: { title: 'Course Offerings', description: 'Assign teachers to courses for the active semester.', side: 'right', align: 'center' } },
        { element: '[href="/staff/grades"]', popover: { title: 'Grade Entry', description: 'Enter or review student grades after exams.', side: 'right', align: 'center' } },
        { element: '[href="/staff/payments"]', popover: { title: 'Payments', description: 'Monitor student fee payments.', side: 'right', align: 'center' } }
      ];
    } else if (role === 'teacher') {
      steps = [
        { popover: { title: 'Welcome, Faculty Member 👋', description: 'Here is a quick overview of your portal.' } },
        { element: '[href="/teacher/dashboard"]', popover: { title: 'Dashboard', description: 'View your quick stats and recent activities.', side: 'right', align: 'center' } },
        { element: '[href="/teacher/courses"]', popover: { title: 'My Courses & Grade Entry', description: 'View courses assigned to you and submit student grades.', side: 'right', align: 'center' } },
        { element: '[href="/teacher/profile"]', popover: { title: 'Profile', description: 'Update your contact information.', side: 'right', align: 'center' } }
      ];
    }

    if (steps.length === 0) return;

    driverObj.current = driver({
      showProgress: true,
      animate: true,
      opacity: 0.75,
      padding: 10,
      allowClose: true,
      overlayClickNext: false,
      doneBtnText: 'Finish',
      closeBtnText: 'Skip',
      nextBtnText: '→ Next',
      prevBtnText: '← Back',
      onDestroyed: () => {
        if (user.tour_completed === 0 || user.tour_completed === false) {
          localStorage.setItem('gstu-tour-completed', 'true');
          completeTour();
        }
      },
      steps
    });

    const hasCompletedLocal = localStorage.getItem('gstu-tour-completed') === 'true';
    const shouldRun = (user.tour_completed === 0 || user.tour_completed === false) && !hasCompletedLocal;
    
    if (shouldRun) {
      setTimeout(() => {
        driverObj.current?.drive();
      }, 800);
    }
  }, [user, role, completeTour]);

  useEffect(() => {
    const handleStartTour = () => {
      if (driverObj.current) {
        setTimeout(() => {
          driverObj.current.drive();
        }, 100);
      }
    };
    window.addEventListener('start-tour', handleStartTour);
    return () => window.removeEventListener('start-tour', handleStartTour);
  }, []);

  return null;
}
