import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProgramPlay from './pages/ProgramPlay';
import MyHistory from './pages/MyHistory';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManagePrograms from './pages/admin/ManagePrograms';
import EnterResults from './pages/admin/EnterResults';
import ManagePayments from './pages/admin/ManagePayments';
import ManageUsers from './pages/admin/ManageUsers';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/programa/:id" element={<ProgramPlay />} />
          <Route path="/historial" element={<MyHistory />} />
          <Route path="/ranking" element={<Leaderboard />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/programas" element={<ManagePrograms />} />
            <Route path="/admin/resultados" element={<EnterResults />} />
            <Route path="/admin/pagos" element={<ManagePayments />} />
            <Route path="/admin/usuarios" element={<ManageUsers />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
