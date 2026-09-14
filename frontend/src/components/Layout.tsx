import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const mainLinks = [
    ['dashboard', 'Dashboard', 'fa-chart-pie'],
    ['atendimento', 'Meu atendimento', 'fa-bullhorn'],
    ['pacientes', 'Pacientes', 'fa-users'],
    ['medicos', 'Médicos', 'fa-user-md'],
    ['enfermeiros', 'Enfermeiros', 'fa-user-nurse'],
    ['unidades', 'Unidades', 'fa-building'],
    ['salas', 'Salas por unidade', 'fa-door-open'],
    ['consultas', 'Consultas', 'fa-calendar-check'],
    ['triagem', 'Triagem', 'fa-heartbeat'],
    ['prontuarios', 'Prontuários', 'fa-file-medical'],
    ['prescricoes', 'Prescrições', 'fa-prescription'],
    ['relatorios', 'Relatórios', 'fa-chart-bar'],
  ];

  const supportLinks = [
    ['farmacia', 'Farmácia', 'fa-pills'],
    ['estoque', 'Estoque', 'fa-boxes-stacked'],
    ['movimentacoes', 'Movimentações', 'fa-exchange-alt'],
    ['dispensacao', 'Dispensação', 'fa-hand-holding-medical'],
  ];

  const purchaseLinks = [
    ['solicitacoes', 'Solicitações', 'fa-file-invoice'],
    ['notas-fiscais', 'Notas Fiscais', 'fa-file-invoice-dollar'],
    ['fornecedores', 'Fornecedores', 'fa-truck'],
  ];

  const linkGroup = (links: string[][]) => links.map(([path, label, icon]) => (
    <NavLink key={path} to={`/${path}`} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
      <i className={`nav-icon fas ${icon}`} aria-hidden="true" />
      <span className="sidebar-text">{label}</span>
    </NavLink>
  ));

  return (
    <div className={collapsed ? 'app-shell shell-collapsed' : 'app-shell'}>
      <aside className="sidebar">
        <div>
          <div className="brand-block">
            <div className="brand-mark">H</div>
            <div className="sidebar-text">
              <strong>Hospitalar</strong>
              <small>Gestão clínica</small>
            </div>
          </div>

          <nav className="nav-menu">
            {linkGroup(mainLinks)}
            <NavLink to="/sala-vermelha" className={location.pathname === '/sala-vermelha' ? 'nav-item red-nav-item active' : 'nav-item red-nav-item'}>
              <i className="nav-icon fas fa-truck-medical" aria-hidden="true" /><span className="sidebar-text">Sala Vermelha</span>
            </NavLink>
            <div className="nav-section sidebar-text">Farmácia & Estoque</div>
            {linkGroup(supportLinks)}
            <div className="nav-section sidebar-text">Compras</div>
            {linkGroup(purchaseLinks)}
            <div className="nav-section nav-section-last">Configurações</div>
            <NavLink to="/configuracoes" className={location.pathname === '/configuracoes' ? 'nav-item active' : 'nav-item'}>
              <i className="nav-icon fas fa-cog" aria-hidden="true" /><span className="sidebar-text">Configurações</span>
            </NavLink>
            <a className="nav-item" href="/painel" target="_blank" rel="noreferrer">
              <i className="nav-icon fas fa-tv" aria-hidden="true" /><span className="sidebar-text">Painel TV</span>
            </a>
          </nav>
        </div>

        <div className="user-panel">
          <div className="sidebar-text">
            <strong>{user?.nome || 'Usuário'}</strong>
            <small>{user?.papel || 'Perfil'}</small>
          </div>
          <button type="button" onClick={logout} title="Sair">Sair</button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button" type="button" onClick={() => setCollapsed((value) => !value)} aria-label="Recolher menu"><i className="fas fa-bars" /></button>
            <div className="breadcrumbs"><span>Hospitalar</span><b>›</b><strong>{location.pathname.slice(1) || 'dashboard'}</strong></div>
          </div>
          <div className="topbar-right">
            <div className="unit-chip"><i className="fas fa-building" /> {user?.unidadeSaudeNome || 'Todas as unidades'}</div>
            <div className="profile-summary"><div><strong>{user?.nome || 'Usuário'}</strong><small>{user?.papel || 'Perfil'}</small></div><div className="avatar">{(user?.nome || 'U').slice(0, 2).toUpperCase()}</div></div>
          </div>
        </header>
        <main className="content-panel"><Outlet /></main>
      </div>
    </div>
  );
}
