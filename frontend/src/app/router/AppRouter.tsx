import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, ProtectedRoute, RoleRoute } from "./guards";
import { AuthLayout } from "../../layouts/AuthLayout";
import { AdminLayout } from "../../layouts/AppLayout";
import { StudentLayout } from "../../layouts/StudentLayout";
import { LoginPage } from "../../pages/auth/LoginPage";
import { RegisterPage } from "../../pages/auth/RegisterPage";
import { AdminDashboard } from "../../pages/DashboardPages";
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
import { EquipmentPage } from "../../pages/admin/EquipmentPage";
import { AdminContractsPage } from "../../pages/admin/ContractsPage";
import { AdminRoomChangeRequestsPage } from "../../pages/admin/RoomChangeRequestsPage";
import { StudentContractsPage } from "../../pages/student/ContractsPage";
import { StudentRoomChangePage } from "../../pages/student/RoomChangePage";
import { NotFoundPage, UnauthorizedPage } from "../../pages/SystemPages";
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
        <Route index element={<AdminDashboard />} />
        <Route path="buildings" element={<BuildingsPage />} />
        <Route path="room-types" element={<RoomTypesPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="rooms/:id" element={<RoomDetailPage />} />
        <Route
          path="equipment-categories"
          element={<EquipmentCategoriesPage />}
        />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="contracts" element={<AdminContractsPage />} />
        <Route
          path="room-change-requests"
          element={<AdminRoomChangeRequestsPage />}
        />
      </Route>
      <Route path="/student" element={student(<StudentLayout />)}>
        <Route index element={<StudentDashboardPage />} />
        <Route path="room" element={<StudentRoomPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="contracts" element={<StudentContractsPage />} />
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
