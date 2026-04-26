import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar as CalendarIcon,
  MessagesSquare,
  User as UserIcon,
  BookOpen,
  Wallet,
} from "lucide-react";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import RoleLayout from "./layouts/RoleLayout";

import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import Organizations from "./pages/super-admin/Organizations";
import AllUsers from "./pages/super-admin/AllUsers";
import Admins from "./pages/super-admin/Admins";
import Teachers from "./pages/super-admin/Teachers";
import Students from "./pages/super-admin/Students";
import Profile from "./pages/super-admin/Profile";
import AuditLogs from "./pages/super-admin/AuditLogs";
import Finance from "./pages/super-admin/Finance";
import CalendarPage from "./pages/super-admin/Calendar";
import Messages from "./pages/super-admin/Messages";
import ComingSoon from "./pages/ComingSoon";

import AdminDashboard from "./pages/admin/Dashboard";
import TeacherDashboard from "./pages/teacher/Dashboard";
import StudentDashboard from "./pages/student/Dashboard";
import AdministratorDashboard from "./pages/administrator/Dashboard";

import MembersList from "./pages/shared/MembersList";
import OrgEvents from "./pages/shared/OrgEvents";
import OrgMessages from "./pages/shared/OrgMessages";
import OrgPayments from "./pages/shared/OrgPayments";
import SharedProfile from "./pages/shared/SharedProfile";
import StudentPayment from "./pages/student/Payment";

const queryClient = new QueryClient();

const adminNav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/teachers", label: "O'qituvchilar", icon: GraduationCap },
  { to: "/admin/students", label: "Talabalar", icon: Users },
  { to: "/admin/payments", label: "To'lovlar", icon: Wallet },
  { to: "/admin/calendar", label: "Kalendar", icon: CalendarIcon },
  { to: "/admin/messages", label: "Xabarlar", icon: MessagesSquare },
  { to: "/admin/profile", label: "Profil", icon: UserIcon },
];

const administratorNav = [
  { to: "/administrator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/administrator/teachers", label: "O'qituvchilar", icon: GraduationCap },
  { to: "/administrator/students", label: "Talabalar", icon: Users },
  { to: "/administrator/payments", label: "To'lovlar", icon: Wallet },
  { to: "/administrator/calendar", label: "Kalendar", icon: CalendarIcon },
  { to: "/administrator/messages", label: "Xabarlar", icon: MessagesSquare },
  { to: "/administrator/profile", label: "Profil", icon: UserIcon },
];

const teacherNav = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/teacher/students", label: "Talabalar", icon: Users },
  { to: "/teacher/calendar", label: "Jadval", icon: CalendarIcon },
  { to: "/teacher/messages", label: "Xabarlar", icon: MessagesSquare },
  { to: "/teacher/profile", label: "Profil", icon: UserIcon },
];

const studentNav = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/teachers", label: "O'qituvchilar", icon: GraduationCap },
  { to: "/student/calendar", label: "Jadval", icon: CalendarIcon },
  { to: "/student/payment", label: "To'lov", icon: Wallet },
  { to: "/student/messages", label: "Xabarlar", icon: MessagesSquare },
  { to: "/student/profile", label: "Profil", icon: UserIcon },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors closeButton />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />

              {/* Super Admin */}
              <Route
                path="/super-admin"
                element={
                  <ProtectedRoute allow={["super_admin"]}>
                    <SuperAdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<SuperAdminDashboard />} />
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="organizations" element={<Organizations />} />
                <Route path="users" element={<AllUsers />} />
                <Route path="admins" element={<Admins />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="students" element={<Students />} />
                <Route path="audit" element={<AuditLogs />} />
                <Route path="administrators" element={<ComingSoon title="Administratorlar" />} />
                <Route path="finance" element={<Finance />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="messages" element={<Messages />} />
                <Route path="settings" element={<ComingSoon title="Sozlamalar" />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Admin (tashkilot egasi) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allow={["admin"]}>
                    <RoleLayout brand="EduCore" subtitle="Admin" nav={adminNav} />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="teachers" element={<MembersList role="teacher" title="O'qituvchilar" description="Tashkilot o'qituvchilari" canManage />} />
                <Route path="students" element={<MembersList role="student" title="Talabalar" description="Tashkilot talabalari" canManage />} />
                <Route path="calendar" element={<OrgEvents canManage />} />
                <Route path="messages" element={<OrgMessages />} />
                <Route path="payments" element={<OrgPayments />} />
                <Route path="profile" element={<SharedProfile />} />
              </Route>

              {/* Administrator (o'quv jarayoni boshqaruvchisi) */}
              <Route
                path="/administrator"
                element={
                  <ProtectedRoute allow={["administrator"]}>
                    <RoleLayout brand="EduCore" subtitle="Administrator" nav={administratorNav} />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdministratorDashboard />} />
                <Route path="dashboard" element={<AdministratorDashboard />} />
                <Route path="teachers" element={<MembersList role="teacher" title="O'qituvchilar" description="O'quv jarayoni" canManage />} />
                <Route path="students" element={<MembersList role="student" title="Talabalar" description="O'quv jarayoni" canManage />} />
                <Route path="calendar" element={<OrgEvents canManage />} />
                <Route path="messages" element={<OrgMessages />} />
                <Route path="payments" element={<OrgPayments />} />
                <Route path="profile" element={<SharedProfile />} />
              </Route>

              {/* Teacher */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allow={["teacher"]}>
                    <RoleLayout brand="EduCore" subtitle="O'qituvchi" nav={teacherNav} />
                  </ProtectedRoute>
                }
              >
                <Route index element={<TeacherDashboard />} />
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="students" element={<MembersList role="student" title="Mening talabalarim" description="Tashkilot talabalari" />} />
                <Route path="calendar" element={<OrgEvents />} />
                <Route path="messages" element={<OrgMessages />} />
                <Route path="profile" element={<SharedProfile />} />
              </Route>

              {/* Student */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allow={["student"]}>
                    <RoleLayout brand="EduCore" subtitle="Talaba" nav={studentNav} />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StudentDashboard />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="teachers" element={<MembersList role="teacher" title="O'qituvchilarim" description="Tashkilot o'qituvchilari" />} />
                <Route path="calendar" element={<OrgEvents />} />
                <Route path="messages" element={<OrgMessages />} />
                <Route path="payment" element={<StudentPayment />} />
                <Route path="profile" element={<SharedProfile />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
