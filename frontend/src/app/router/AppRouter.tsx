import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { GuestRoute, ProtectedRoute, RoleRoute } from "./guards";
import { AuthLayout } from "../../layouts/AuthLayout";
import { AdminLayout } from "../../layouts/AdminLayout";
import { StudentLayout } from "../../layouts/StudentLayout";
import { NotFoundPage, UnauthorizedPage } from "../../pages/SystemPages";
import { useAuth } from "../../hooks/useAuth";
import { LoadingState } from "../../components/ui/States";

const LoginPage = lazy(() => import("../../pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("../../pages/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const AdminDashboardPage = lazy(() => import("../../pages/admin/DashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const StudentDashboardPage = lazy(() => import("../../pages/student/DashboardPage").then((m) => ({ default: m.StudentDashboardPage })));
const BuildingsPage = lazy(() => import("../../pages/admin/ResourcePages").then((m) => ({ default: m.BuildingsPage })));
const RoomTypesPage = lazy(() => import("../../pages/admin/ResourcePages").then((m) => ({ default: m.RoomTypesPage })));
const EquipmentCategoriesPage = lazy(() => import("../../pages/admin/ResourcePages").then((m) => ({ default: m.EquipmentCategoriesPage })));
const BuildingDetailPage = lazy(() => import("../../pages/admin/BuildingDetailPage").then((m) => ({ default: m.BuildingDetailPage })));
const RoomsPage = lazy(() => import("../../pages/admin/RoomsPage").then((m) => ({ default: m.RoomsPage })));
const RoomDetailPage = lazy(() => import("../../pages/admin/RoomDetailPage").then((m) => ({ default: m.RoomDetailPage })));
const EquipmentPage = lazy(() => import("../../pages/admin/EquipmentPage").then((m) => ({ default: m.EquipmentPage })));
const AdminStudentsPage = lazy(() => import("../../pages/admin/StudentsPage").then((m) => ({ default: m.AdminStudentsPage })));
const AdminStudentDetailPage = lazy(() => import("../../pages/admin/StudentDetailPage").then((m) => ({ default: m.AdminStudentDetailPage })));
const AdminStudentRegistryPage = lazy(() => import("../../pages/admin/StudentRegistryPage").then((m) => ({ default: m.AdminStudentRegistryPage })));
const AdminContractsPage = lazy(() => import("../../pages/admin/ContractsPage").then((m) => ({ default: m.AdminContractsPage })));
const AdminContractDetailPage = lazy(() => import("../../pages/admin/ContractDetailPage").then((m) => ({ default: m.AdminContractDetailPage })));
const AdminNotificationsPage = lazy(() => import("../../pages/admin/NotificationsPage").then((m) => ({ default: m.AdminNotificationsPage })));
const AdminMaintenancePage = lazy(() => import("../../pages/admin/MaintenancePage").then((m) => ({ default: m.AdminMaintenancePage })));
const AdminStaffPage = lazy(() => import("../../pages/admin/StaffPage").then((m) => ({ default: m.AdminStaffPage })));
const AdminAuditLogsPage = lazy(() => import("../../pages/admin/AuditLogsPage").then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminBillingPage = lazy(() => import("../../pages/admin/BillingPage").then((m) => ({ default: m.AdminBillingPage })));
const AdminPaymentsPage = lazy(() => import("../../pages/admin/PaymentsPage").then((m) => ({ default: m.AdminPaymentsPage })));
const AdminCheckoutRequestsPage = lazy(() => import("../../pages/admin/CheckoutRequestsPage").then((m) => ({ default: m.AdminCheckoutRequestsPage })));
const AdminRoomChangeRequestsPage = lazy(() => import("../../pages/admin/RoomChangeRequestsPage").then((m) => ({ default: m.AdminRoomChangeRequestsPage })));
const StudentRoomPage = lazy(() => import("../../pages/student/RoomPage").then((m) => ({ default: m.StudentRoomPage })));
const StudentRoomRegistrationPage = lazy(() => import("../../pages/student/RoomRegistrationPage").then((m) => ({ default: m.StudentRoomRegistrationPage })));
const StudentProfilePage = lazy(() => import("../../pages/student/ProfilePage").then((m) => ({ default: m.StudentProfilePage })));
const StudentNotificationsPage = lazy(() => import("../../pages/student/NotificationsPage").then((m) => ({ default: m.StudentNotificationsPage })));
const StudentMaintenancePage = lazy(() => import("../../pages/student/MaintenancePage").then((m) => ({ default: m.StudentMaintenancePage })));
const StudentSchedulePage = lazy(() => import("../../pages/student/SchedulePage").then((m) => ({ default: m.StudentSchedulePage })));
const StudentInvoicesPage = lazy(() => import("../../pages/student/InvoicesPage").then((m) => ({ default: m.StudentInvoicesPage })));
const StudentRoomChangePage = lazy(() => import("../../pages/student/RoomChangePage").then((m) => ({ default: m.StudentRoomChangePage })));
const admin = (node: React.ReactNode) => (
  <ProtectedRoute>
    <RoleRoute role="ADMIN">{node}</RoleRoute>
  </ProtectedRoute>
);
const student = (node: React.ReactNode) => (
  <ProtectedRoute>
    <RoleRoute role="STUDENT">{node}</RoleRoute>
  </ProtectedRoute>
);
function Home() {
  const { user, isInitializing } = useAuth();
  if (isInitializing) return null;
  return (
    <Navigate
      to={
        !user
          ? "/login"
          : user.role === "ADMIN"
            ? "/admin"
            : user.role === "STUDENT"
              ? "/student"
              : "/unauthorized"
      }
      replace
    />
  );
}
export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        element={
          <GuestRoute>
            <AuthLayout />
          </GuestRoute>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/admin" element={admin(<AdminLayout />)}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="buildings" element={<BuildingsPage />} />
        <Route path="buildings/:buildingId" element={<BuildingDetailPage />} />
        <Route
          path="buildings/:buildingId/floors/:floor/rooms"
          element={<RoomsPage />}
        />
        <Route path="room-types" element={<RoomTypesPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="rooms/:id" element={<RoomDetailPage />} />
        <Route
          path="equipment-categories"
          element={<EquipmentCategoriesPage />}
        />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="student-registry" element={<AdminStudentRegistryPage />} />
        <Route path="students/:id" element={<AdminStudentDetailPage />} />
        <Route path="contracts" element={<AdminContractsPage />} />
        <Route path="contracts/:id" element={<AdminContractDetailPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
        <Route path="maintenance" element={<AdminMaintenancePage />} />
        <Route path="staff" element={<AdminStaffPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="billing" element={<AdminBillingPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route
          path="checkout-requests"
          element={<AdminCheckoutRequestsPage />}
        />
        <Route
          path="room-change-requests"
          element={<AdminRoomChangeRequestsPage />}
        />
      </Route>
      <Route path="/student" element={student(<StudentLayout />)}>
        <Route index element={<StudentDashboardPage />} />
        <Route path="room" element={<StudentRoomPage />} />
        <Route path="room/register" element={<StudentRoomRegistrationPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route
          path="contracts"
          element={<Navigate to="/student/room" replace />}
        />
        <Route path="notifications" element={<StudentNotificationsPage />} />
        <Route path="maintenance" element={<StudentMaintenancePage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="invoices" element={<StudentInvoicesPage />} />
        <Route
          path="room-change-requests"
          element={<StudentRoomChangePage />}
        />
      </Route>
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
