import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute, AdminRoute, SuperAdminRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReunionPlay from './pages/ReunionPlay';
import MyHistory from './pages/MyHistory';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageReuniones from './pages/admin/ManageReuniones';
import EnterResults from './pages/admin/EnterResults';
import ManageUsers from './pages/admin/ManageUsers';
import ManageProgramas from './pages/admin/ManageProgramas';
import ManageHorses from './pages/admin/ManageHorses';
import ManageAdmins from './pages/admin/ManageAdmins';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reunion/:id" element={<ReunionPlay />} />
          <Route path="/historial" element={<MyHistory />} />
          <Route path="/ranking" element={<Leaderboard />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/reuniones" element={<ManageReuniones />} />
            <Route path="/admin/resultados" element={<EnterResults />} />
            <Route path="/admin/usuarios" element={<ManageUsers />} />
            <Route path="/admin/programas" element={<ManageProgramas />} />
            <Route path="/admin/caballos" element={<ManageHorses />} />
          </Route>
          <Route element={<SuperAdminRoute />}>
            <Route path="/admin/admins" element={<ManageAdmins />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
