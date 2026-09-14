import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPacientes } from '../api/pacientes';
import { listMedicos } from '../api/medicos';
import { listEnfermeiros } from '../api/enfermeiros';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { token } = useAuth();
  const [patients, setPatients] = useState(0);
  const [doctors, setDoctors] = useState(0);
  const [nurses, setNurses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      listPacientes(token),
      listMedicos(token),
      listEnfermeiros(token),
    ])
      .then(([pacientes, medicos, enfermeiros]) => {
        setPatients(pacientes.length);
        setDoctors(medicos.length);
        setNurses(enfermeiros.length);
      })
      .catch(() => {
        setPatients(0);
        setDoctors(0);
        setNurses(0);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">Visão geral operacional</p>
          <h2>Dashboard</h2>
          <p className="page-subtitle">Acompanhe a operação do sistema em tempo real.</p>
        </div>
        <div className="filters"><select><option>Todas as unidades</option></select><select><option>Hoje</option><option>7 dias</option><option>30 dias</option></select></div>
      </header>

      {loading ? (
        <div className="loading-box">Carregando indicadores...</div>
      ) : (
        <div className="stats-grid six-stats">
          <div className="stat-card"><div className="stat-icon blue">◉</div><span>Pacientes ativos</span><strong>{patients}</strong></div>
          <div className="stat-card"><div className="stat-icon petrol">✚</div><span>Médicos</span><strong>{doctors}</strong></div>
          <div className="stat-card"><div className="stat-icon green">♙</div><span>Enfermeiros</span><strong>{nurses}</strong></div>
          <div className="stat-card"><div className="stat-icon purple">⌂</div><span>Unidades</span><strong>6</strong></div>
          <div className="stat-card"><div className="stat-icon orange">□</div><span>Consultas hoje</span><strong>84</strong></div>
          <div className="stat-card"><div className="stat-icon red">◷</div><span>Triagens pendentes</span><strong>12</strong></div>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="panel gravity-panel">
          <h3>◉ Distribuição por gravidade</h3>
          {[
            ['Emergência', 3, 'red'], ['Muito urgente', 8, 'orange'], ['Urgente', 24, 'yellow'], ['Pouco urgente', 41, 'green'], ['Não urgente', 18, 'blue'],
          ].map(([label, value, color]) => <div className="gravity-row" key={label as string}><div><span>{label}</span><b>{value}</b></div><div className="progress"><i className={color as string} style={{ width: `${Number(value) * 2}%` }} /></div></div>)}
        </section>

        <section className="panel alert-panel">
          <h3>◷ Alertas clínicos e administrativos</h3>
          <div className="alert-item danger"><b>Surto respiratório</b><span>Aumento de casos respiratórios na unidade.</span></div>
          <div className="alert-item warning"><b>Estoque baixo</b><span>Itens abaixo do mínimo precisam de reposição.</span></div>
          <div className="alert-item info"><b>Triagem pendente</b><span>12 pacientes aguardando classificação.</span></div>
        </section>
      </div>

      <section className="panel shortcuts-panel"><h3>⚡ Atalhos rápidos</h3><div className="shortcut-grid"><Link to="/pacientes">◉<span><b>Cadastrar paciente</b><small>Novo registro</small></span></Link><Link to="/consultas">□<span><b>Criar consulta</b><small>Agendamento</small></span></Link><Link to="/triagem">♥<span><b>Iniciar triagem</b><small>Classificação</small></span></Link><Link to="/painel" target="_blank" rel="noreferrer">▣<span><b>Abrir painel TV</b><small>Chamadas</small></span></Link></div></section>
    </div>
  );
}
