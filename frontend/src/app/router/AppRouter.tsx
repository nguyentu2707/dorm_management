import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, ProtectedRoute, RoleRoute } from "./guards";
import { AuthLayout } from "../../layouts/AuthLayout";
import { AdminLayout } from "../../layouts/AppLayout";
import { StudentLayout } from "../../layouts/StudentLayout";
import { LoginPage } from "../../pages/auth/LoginPage";
import { RegisterPage } from "../../pages/auth/RegisterPage";
import { AdminDashboardPage } from "../../pages/admin/DashboardPage";
import { StudentDashboardPage } from "../../pages/student/DashboardPage";
import { StudentProfilePage } from "../../pages/student/ProfilePage";
import { StudentRoomPage } from "../../pages/student/RoomPage";
import {
  BuildingsPage,
  EquipmentCategoriesPage,
  RoomTypesPage,
} from "../../pages/admin/ResourcePages";
import { RoomsPage } from "../../pages/admin/RoomsPage";
import { RoomDetailPage } from "../../pages/admin/RoomDetailPage";
import { BuildingDetailPage } from "../../pages/admin/BuildingDetailPage";
import { EquipmentPage } from "../../pages/admin/EquipmentPage";
import { AdminContractsPage } from "../../pages/admin/ContractsPage";
import { AdminRoomChangeRequestsPage } from "../../pages/admin/RoomChangeRequestsPage";
import { AdminStudentsPage } from "../../pages/admin/StudentsPage";
import { AdminStudentDetailPage } from "../../pages/admin/StudentDetailPage";
import { AdminContractDetailPage } from "../../pages/admin/ContractDetailPage";
import { StudentRoomChangePage } from "../../pages/student/RoomChangePage";
import { NotFoundPage, UnauthorizedPage } from "../../pages/SystemPages";
import { StudentNotificationsPage } from "../../pages/student/NotificationsPage";
import { AdminNotificationsPage } from "../../pages/admin/NotificationsPage";
import { StudentMaintenancePage } from "../../pages/student/MaintenancePage";
import { AdminMaintenancePage } from "../../pages/admin/MaintenancePage";
import { AdminCheckoutRequestsPage } from "../../pages/admin/CheckoutRequestsPage";
import { AdminBillingPage } from "../../pages/admin/BillingPage";
import { AdminPaymentsPage } from "../../pages/admin/PaymentsPage";
import { AdminStudentRegistryPage } from "../../pages/admin/StudentRegistryPage";
import { StudentInvoicesPage } from "../../pages/student/InvoicesPage";
import { StudentRoomRegistrationPage } from "../../pages/student/RoomRegistrationPage";
import { StudentSchedulePage } from "../../pages/student/SchedulePage";
import { useAuth } from "../../hooks/useAuth";
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
        <Route path="buildings/:buildingId/floors/:floor/rooms" element={<RoomsPage />} />
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
  );
}
