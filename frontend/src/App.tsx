import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterAdminPage from './pages/RegisterAdminPage';
import DashboardPage from './pages/DashboardPage';
import PacientesPage from './pages/PacientesPage';
import MedicosPage from './pages/MedicosPage';
import EnfermeirosPage from './pages/EnfermeirosPage';
import ModulePage from './pages/ModulePage';
import TvPanelPage from './pages/TvPanelPage';
import CareOperationsPage from './pages/CareOperationsPage';
import RoomsPage from './pages/RoomsPage';
import RedRoomPage from './pages/RedRoomPage';
import PatientDetailsPage from './pages/PatientDetailsPage';
import PatientEditPage from './pages/PatientEditPage';

import './App.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register-admin" element={<RegisterAdminPage />} />
        <Route path="/painel" element={<TvPanelPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/atendimento" element={<CareOperationsPage />} />
          <Route path="/salas" element={<RoomsPage />} />
          <Route path="/sala-vermelha" element={<RedRoomPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/pacientes/:id/editar" element={<PatientEditPage />} />
          <Route path="/pacientes/:id" element={<PatientDetailsPage />} />
          <Route path="/medicos" element={<MedicosPage />} />
          <Route path="/enfermeiros" element={<EnfermeirosPage />} />
          <Route path="/unidades" element={<ModulePage />} />
          <Route path="/consultas" element={<ModulePage />} />
          <Route path="/triagem" element={<ModulePage />} />
          <Route path="/prontuarios" element={<ModulePage />} />
          <Route path="/prescricoes" element={<ModulePage />} />
          <Route path="/relatorios" element={<ModulePage />} />
          <Route path="/farmacia" element={<ModulePage />} />
          <Route path="/estoque" element={<ModulePage />} />
          <Route path="/movimentacoes" element={<ModulePage />} />
          <Route path="/dispensacao" element={<ModulePage />} />
          <Route path="/solicitacoes" element={<ModulePage />} />
          <Route path="/notas-fiscais" element={<ModulePage />} />
          <Route path="/fornecedores" element={<ModulePage />} />
          <Route path="/configuracoes" element={<ModulePage />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
