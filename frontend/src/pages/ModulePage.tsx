import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { listPacientes } from '../api/pacientes';
import { useAuth } from '../contexts/AuthContext';
import type { PatientRecord } from '../types/auth';

const modules: Record<string, { title: string; description: string; icon: string }> = {
  unidades: { title: 'Unidades de Saúde', description: 'Hospitais, UPAs e UBSs da rede.', icon: 'fa-building' },
  consultas: { title: 'Consultas', description: 'Agenda de atendimentos e acompanhamento clínico.', icon: 'fa-calendar-check' },
  triagem: { title: 'Triagem', description: 'Classificação de risco e fila de atendimento.', icon: 'fa-heartbeat' },
  prontuarios: { title: 'Prontuários', description: 'Registros clínicos dos pacientes.', icon: 'fa-file-medical' },
  prescricoes: { title: 'Prescrições', description: 'Medicamentos e tratamentos prescritos.', icon: 'fa-prescription' },
  relatorios: { title: 'Relatórios e IA', description: 'Análises operacionais e clínicas anonimizadas.', icon: 'fa-chart-bar' },
  farmacia: { title: 'Farmácia', description: 'Visão geral do estoque e dispensação.', icon: 'fa-pills' },
  estoque: { title: 'Estoque', description: 'Itens, lotes, validade e níveis mínimos.', icon: 'fa-boxes-stacked' },
  movimentacoes: { title: 'Movimentações', description: 'Entradas, saídas e ajustes de estoque.', icon: 'fa-exchange-alt' },
  dispensacao: { title: 'Dispensação', description: 'Vincule prescrições aos itens disponíveis.', icon: 'fa-hand-holding-medical' },
  solicitacoes: { title: 'Solicitações de Compra', description: 'Pedidos de medicamentos e materiais.', icon: 'fa-file-invoice' },
  'notas-fiscais': { title: 'Notas Fiscais', description: 'Lançamento e conferência de NF-e.', icon: 'fa-file-invoice-dollar' },
  fornecedores: { title: 'Fornecedores', description: 'Cadastro de fornecedores hospitalares.', icon: 'fa-truck' },
  configuracoes: { title: 'Configurações', description: 'Preferências do sistema e da conta.', icon: 'fa-cog' },
};

function Header({ page, action = 'Novo registro' }: { page: keyof typeof modules; action?: string | null }) {
  const module = modules[page];
  return <header className="page-header"><div><p className="eyebrow">Hospitalar</p><h2>{module.title}</h2><p className="page-subtitle">{module.description}</p></div>{action ? <button type="button" className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent('module-create'))}><i className="fas fa-plus" /> {action}</button> : null}</header>;
}

function Toolbar({ placeholder = 'Buscar registros...' }: { placeholder?: string }) {
  return <div className="reference-toolbar"><div className="search-control"><i className="fas fa-search" /><input placeholder={placeholder} /></div><select><option>Todas as unidades</option></select><select><option>Todos os status</option><option>Ativo</option><option>Pendente</option></select></div>;
}

function EmptyTable({ columns = 5 }: { columns?: number }) {
  return <tbody><tr><td colSpan={columns} className="reference-empty"><i className="fas fa-inbox" /><strong>Nenhum registro disponível</strong><span>Os dados deste módulo aparecerão aqui quando forem cadastrados.</span></td></tr></tbody>;
}

function UnitsPage() {
  return <><Header page="unidades" action="Nova unidade" /><div className="unit-cards"><article className="unit-card"><div className="unit-card-icon"><i className="fas fa-hospital" /></div><span className="status-pill status-active">Ativo</span><h3>Unidade hospitalar</h3><p>Hospital • CNES pendente</p><small>Equipe e serviços da unidade</small><footer><button>Ver equipe</button><button>Editar</button></footer></article><article className="unit-card"><div className="unit-card-icon"><i className="fas fa-clinic-medical" /></div><span className="status-pill status-active">Ativo</span><h3>UPA de atendimento</h3><p>UPA • CNES pendente</p><small>Fila de triagem e consultas</small><footer><button>Ver equipe</button><button>Editar</button></footer></article><article className="unit-card empty-unit"><i className="fas fa-plus" /><strong>Adicionar unidade</strong><span>Cadastre uma nova unidade de saúde</span></article></div></>;
}

function ConsultasPage() {
  return <><Header page="consultas" action="Nova consulta" /><div className="view-tabs"><button className="selected">Dia</button><button>Semana</button><button>Mês</button></div><section className="reference-card"><Toolbar placeholder="Buscar por paciente ou médico..." /><table className="reference-table"><thead><tr><th>Paciente</th><th>Médico</th><th>Data e hora</th><th>Unidade</th><th>CID-10</th><th>Status</th><th /></tr></thead><EmptyTable columns={7} /></table></section></>;
}

function TriagePage() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get('pacienteId') || '');
  const [unitId, setUnitId] = useState(user?.unidadeSaudeId || '');
  const [complaint, setComplaint] = useState('');
  const [vitals, setVitals] = useState({ systolic: '', diastolic: '', heartRate: '', respiratoryRate: '', temperature: '', oxygen: '', pain: '', conscious: true });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    listPacientes(token).then(setPatients).catch(() => setPatients([]));
  }, [token]);

  function updateVital(field: string, value: string | boolean) {
    setVitals((current) => ({ ...current, [field]: value }));
  }

  async function saveTriage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/triagens', { method: 'POST', body: JSON.stringify({
        pacienteId: patientId,
        unidadeSaudeId: unitId,
        queixaPrincipal: complaint,
        sinaisVitais: {
          pressaoArterialSistolica: Number(vitals.systolic),
          pressaoArterialDiastolica: Number(vitals.diastolic),
          frequenciaCardiaca: Number(vitals.heartRate),
          frequenciaRespiratoria: Number(vitals.respiratoryRate),
          temperatura: Number(vitals.temperature),
          saturacaoOxigenio: Number(vitals.oxygen),
          nivelDor: Number(vitals.pain),
          estadoConsciente: vitals.conscious,
        },
      }) }, token);
      setMessage('Triagem salva com sucesso.');
      setComplaint('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a triagem.');
    } finally {
      setSaving(false);
    }
  }

  return <><Header page="triagem" action={null} /><div className="triage-layout"><form className="reference-card triage-form" onSubmit={saveTriage}><h3><i className="fas fa-stethoscope" /> Dados da triagem</h3><div className="form-grid"><label className="wide-field">Paciente<select required value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Selecione um paciente...</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.nome} - CPF {patient.cpf}</option>)}</select></label><label className="wide-field">Unidade de saúde (UUID)<input required value={unitId} onChange={(event) => setUnitId(event.target.value)} placeholder="UUID da unidade" /></label><label className="wide-field">Queixa principal<input required value={complaint} onChange={(event) => setComplaint(event.target.value)} placeholder="Ex.: dor abdominal" /></label>{[['systolic', 'PA sistólica'], ['diastolic', 'PA diastólica'], ['heartRate', 'FC (bpm)'], ['respiratoryRate', 'FR (irpm)'], ['temperature', 'Temperatura'], ['oxygen', 'SpO2 (%)'], ['pain', 'Nível de dor']].map(([field, label]) => <label key={field}>{label}<input required type="number" step="any" value={vitals[field as keyof typeof vitals] as string} onChange={(event) => updateVital(field, event.target.value)} /></label>)}<label className="conscious-field"><input type="checkbox" checked={vitals.conscious} onChange={(event) => updateVital('conscious', event.target.checked)} /> Paciente consciente</label></div>{message ? <div className={message.includes('sucesso') ? 'success-box' : 'error-box'}>{message}</div> : null}<button className="primary-button full-action" disabled={saving}><i className="fas fa-check" /> {saving ? 'Salvando...' : 'Salvar triagem'}</button></form><section className="reference-card queue-panel"><h3><i className="fas fa-list-ol" /> Fila de atendimento</h3><div className="reference-empty compact"><i className="fas fa-clipboard-check" /><strong>Fila vinculada à unidade</strong><span>As triagens salvas aparecerão aqui quando o backend retornar os registros.</span></div></section></div></>;
}

function RecordsPage({ page }: { page: 'prontuarios' | 'prescricoes' }) {
  const isRecord = page === 'prontuarios';
  return <><Header page={page} action={isRecord ? 'Novo prontuário' : 'Nova prescrição'} /><section className="reference-card"><Toolbar placeholder="Buscar por paciente..." />{isRecord ? <div className="clinical-timeline"><div className="timeline-item"><span><i className="fas fa-file-medical" /></span><div><strong>Histórico clínico</strong><small>Selecione um paciente para visualizar os registros.</small><p>Consultas, triagens, diagnósticos e prescrições aparecem organizados cronologicamente.</p></div></div><div className="timeline-item muted"><span><i className="fas fa-lock" /></span><div><strong>Dados protegidos</strong><small>Acesso restrito conforme o perfil profissional.</small></div></div></div> : <table className="reference-table"><thead><tr><th>Paciente</th><th>Detalhes</th><th>CID-10</th><th>Profissional</th><th>Data</th><th /></tr></thead><EmptyTable columns={6} /></table>}</section></>;
}

function ReportsPage() {
  return <><Header page="relatorios" action="Gerar relatório" /><div className="report-cards"><article><span className="report-icon danger"><i className="fas fa-virus" /></span><h3>Risco de surto respiratório</h3><p>Análise agregada de triagens e diagnósticos.</p><button>Gerar relatório <i className="fas fa-arrow-right" /></button></article><article><span className="report-icon blue"><i className="fas fa-user-clock" /></span><h3>Paciente recorrente</h3><p>Identificação de padrões de recorrência.</p><button>Gerar relatório <i className="fas fa-arrow-right" /></button></article><article><span className="report-icon green"><i className="fas fa-chart-line" /></span><h3>Análise operacional</h3><p>Demanda, gravidade e capacidade por unidade.</p><button>Gerar relatório <i className="fas fa-arrow-right" /></button></article></div><section className="privacy-note"><i className="fas fa-shield-alt" /><span>Os dados usados pela análise são agregados e anonimizados, em conformidade com a LGPD.</span></section><section className="reference-card"><h3 className="card-heading"><i className="fas fa-history" /> Histórico de relatórios</h3><div className="reference-empty compact"><i className="fas fa-file-alt" /><strong>Nenhum relatório gerado</strong><span>Os relatórios criados aparecerão nesta lista.</span></div></section></>;
}

function PharmacyPage({ page }: { page: 'farmacia' | 'estoque' | 'movimentacoes' | 'dispensacao' }) {
  const titles = { farmacia: 'Farmácia', estoque: 'Estoque', movimentacoes: 'Movimentações', dispensacao: 'Dispensação' };
  if (page === 'dispensacao') return <><Header page={page} action={null} /><div className="dispensation-grid"><section className="reference-card"><h3 className="card-heading"><i className="fas fa-prescription" /> Prescrição</h3><div className="stack-form"><label>Paciente<select><option>Selecione um paciente...</option></select></label><label>Medicamento<select><option>Selecione um medicamento...</option></select></label><label>Quantidade<input placeholder="Quantidade dispensada" /></label><button className="primary-button"><i className="fas fa-check" /> Confirmar dispensação</button></div></section><section className="reference-card"><h3 className="card-heading"><i className="fas fa-boxes-stacked" /> Estoque disponível</h3><div className="reference-empty compact"><i className="fas fa-box-open" /><strong>Nenhum lote disponível</strong><span>Os lotes liberados aparecerão nesta área.</span></div></section></div></>;
  return <><Header page={page} action={null} /><div className="stats-grid pharmacy-stats"><div className="stat-card"><div className="stat-icon petrol"><i className="fas fa-boxes-stacked" /></div><span>Total de itens</span><strong>0</strong></div><div className="stat-card"><div className="stat-icon orange"><i className="fas fa-triangle-exclamation" /></div><span>Estoque baixo</span><strong>0</strong></div><div className="stat-card"><div className="stat-icon red"><i className="fas fa-calendar-xmark" /></div><span>Vencendo em 30 dias</span><strong>0</strong></div><div className="stat-card"><div className="stat-icon green"><i className="fas fa-dollar-sign" /></div><span>Valor total</span><strong>R$ 0</strong></div></div><section className="reference-card"><Toolbar placeholder={`Buscar em ${titles[page].toLowerCase()}...`} /><table className="reference-table"><thead><tr><th>Item</th><th>Unidade</th><th>Lote</th><th>Validade</th><th>Quantidade</th><th>Status</th><th /></tr></thead><EmptyTable columns={7} /></table></section></>;
}

function NotaFiscalPage() {
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    const open = () => setShowForm(true);
    window.addEventListener('module-create', open);
    return () => window.removeEventListener('module-create', open);
  }, []);

  return <><Header page="notas-fiscais" action="Lançar nota fiscal" />
    {showForm ? <section className="invoice-form reference-card">
      <div className="invoice-form-heading"><div><p className="eyebrow">Entrada de estoque</p><h3>Dados da nota fiscal</h3><p>Todos os produtos da nota serão conferidos antes de entrar no estoque.</p></div><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button></div>
      <div className="invoice-fields">
        <label>Número da nota<input required placeholder="Ex.: 12345" /></label>
        <label>Série<input placeholder="Ex.: 1" /></label>
        <label>Chave de acesso (44 dígitos)<input required maxLength={44} placeholder="00000000000000000000000000000000000000000000" /></label>
        <label>Data de emissão<input required type="date" /></label>
        <label>Data de recebimento<input required type="date" /></label>
        <label>Fornecedor<select><option>Selecione o fornecedor...</option></select></label>
        <label>Unidade de destino<select><option>Selecione a unidade...</option></select></label>
        <label>Valor total<input required type="number" min="0" step="0.01" placeholder="R$ 0,00" /></label>
        <label className="invoice-wide">Observações<textarea rows={2} placeholder="Conferência, divergências ou observações da entrega" /></label>
      </div>
      <div className="invoice-items-heading"><h4><i className="fas fa-boxes-stacked" /> Itens da nota</h4><button type="button" className="secondary-button"><i className="fas fa-plus" /> Adicionar item</button></div>
      <div className="invoice-item-row"><select><option>Medicamento ou material</option></select><input placeholder="Lote" /><input type="date" aria-label="Validade" /><input type="number" min="1" placeholder="Qtd." aria-label="Quantidade" /><input type="number" min="0" step="0.01" placeholder="Valor unit." aria-label="Valor unitário" /><button type="button" className="icon-danger" aria-label="Remover item"><i className="fas fa-trash" /></button></div>
      <footer className="invoice-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button type="button" className="primary-button" onClick={() => setShowForm(false)}><i className="fas fa-check" /> Conferir e lançar entrada</button></footer>
    </section> : null}
    <section className="reference-card invoice-history"><div className="invoice-history-heading"><div><h3><i className="fas fa-file-invoice-dollar" /> Notas fiscais recebidas</h3><p>Use a nota fiscal para registrar a entrada de medicamentos e materiais.</p></div><span className="status-pill status-active"><i className="fas fa-arrow-down" /> Entrada controlada</span></div><Toolbar placeholder="Buscar por número, chave ou fornecedor..." /><table className="reference-table"><thead><tr><th>Nota / série</th><th>Chave de acesso</th><th>Emissão</th><th>Recebimento</th><th>Fornecedor</th><th>Valor total</th><th>Status</th><th /></tr></thead><EmptyTable columns={8} /></table></section>
  </>;
}

function PurchasePage({ page }: { page: 'solicitacoes' | 'notas-fiscais' | 'fornecedores' }) {
  const actions = { solicitacoes: 'Nova solicitação', 'notas-fiscais': 'Lançar nota fiscal', fornecedores: 'Novo fornecedor' };
  return <><Header page={page} action={actions[page]} /><section className="reference-card"><Toolbar placeholder={`Buscar em ${modules[page].title.toLowerCase()}...`} /><table className="reference-table"><thead><tr><th>Identificação</th><th>Data</th><th>Responsável</th><th>Unidade</th><th>Status</th><th /></tr></thead><EmptyTable columns={6} /></table></section></>;
}

function CreateDialog({ page, onClose }: { page: keyof typeof modules; onClose: () => void }) {
  const title = modules[page].title;
  const fields: Record<string, string[]> = {
    unidades: ['Nome da unidade', 'Tipo', 'CNES', 'Telefone', 'Logradouro', 'Número', 'Complemento', 'Bairro', 'Cidade', 'Estado', 'CEP', 'Serviços essenciais', 'Serviços ampliados'],
    consultas: ['Paciente UUID', 'Unidade de saúde UUID', 'Observações', 'CID-10'],
    triagem: ['Paciente UUID', 'Unidade de saúde UUID', 'Queixa principal', 'PA sistólica', 'PA diastólica', 'FC', 'FR', 'Temperatura', 'Saturação de oxigênio', 'Nível de dor', 'Estado consciente'],
    prontuarios: ['Paciente UUID', 'Unidade de saúde UUID', 'Descrição clínica', 'CID-10'],
    prescricoes: ['Paciente UUID', 'Unidade de saúde UUID', 'Detalhes da prescrição', 'CID-10'],
    farmacia: ['Medicamento', 'Princípio ativo', 'Forma farmacêutica'],
    estoque: ['Medicamento', 'Lote', 'Validade', 'Quantidade mínima'],
    movimentacoes: ['Medicamento', 'Tipo de movimentação', 'Quantidade', 'Observação'],
    dispensacao: ['Paciente', 'Prescrição', 'Medicamento', 'Quantidade'],
    solicitacoes: ['Unidade', 'Justificativa', 'Itens solicitados'],
    'notas-fiscais': ['Número da nota', 'Fornecedor', 'Data de recebimento', 'Valor total'],
    fornecedores: ['Razão social', 'CNPJ', 'Contato', 'Telefone', 'E-mail'],
    relatorios: ['Tipo de relatório', 'Unidade de saúde', 'Período'],
    configuracoes: ['Nome de exibição', 'Unidade padrão'],
  };

  return <div className="create-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><header><div><p className="eyebrow">Novo cadastro</p><h3 id="create-title">{title}</h3></div><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><i className="fas fa-times" /></button></header><form onSubmit={(event) => { event.preventDefault(); onClose(); }}><div className="modal-field-grid">{(fields[page] || ['Nome', 'Descrição']).map((field) => <label key={field}>{field}{field.toLowerCase().includes('observa') || field.toLowerCase().includes('descri') || field.toLowerCase().includes('justific') ? <textarea rows={3} placeholder={`Informe ${field.toLowerCase()}`} /> : field === 'Tipo' || field === 'Tipo de movimentação' ? <select><option>Selecione...</option><option>Entrada</option><option>Saída</option><option>Ajuste</option></select> : <input required placeholder={`Informe ${field.toLowerCase()}`} />}</label>)}</div><footer><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button"><i className="fas fa-check" /> Salvar cadastro</button></footer></form></section></div>;
}

export default function ModulePage() {
  const page = useLocation().pathname.slice(1) as keyof typeof modules;
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const open = () => {
      if (page !== 'notas-fiscais') setShowCreate(true);
    };
    window.addEventListener('module-create', open);
    return () => window.removeEventListener('module-create', open);
  }, []);

  let content;
  if (page === 'unidades') content = <UnitsPage />;
  else if (page === 'consultas') content = <ConsultasPage />;
  else if (page === 'triagem') content = <TriagePage />;
  else if (page === 'prontuarios' || page === 'prescricoes') content = <RecordsPage page={page} />;
  else if (page === 'relatorios') content = <ReportsPage />;
  else if (page === 'notas-fiscais') content = <NotaFiscalPage />;
  else if (page === 'farmacia' || page === 'estoque' || page === 'movimentacoes' || page === 'dispensacao') content = <PharmacyPage page={page} />;
  else content = <PurchasePage page={page as 'solicitacoes' | 'notas-fiscais' | 'fornecedores'} />;

  return <div className="page-wrap module-page">{content}{showCreate && page !== 'notas-fiscais' ? <CreateDialog page={page} onClose={() => setShowCreate(false)} /> : null}</div>;
}
