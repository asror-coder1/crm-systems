import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
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
import RolePlaceholder from "./pages/RolePlaceholder";

const queryClient = new QueryClient();

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

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allow={["admin"]}>
                    <RolePlaceholder role="admin" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/administrator/*"
                element={
                  <ProtectedRoute allow={["administrator"]}>
                    <RolePlaceholder role="administrator" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/*"
                element={
                  <ProtectedRoute allow={["teacher"]}>
                    <RolePlaceholder role="teacher" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/*"
                element={
                  <ProtectedRoute allow={["student"]}>
                    <RolePlaceholder role="student" />
                  </ProtectedRoute>
                }
              />

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
