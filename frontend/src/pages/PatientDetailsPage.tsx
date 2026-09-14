import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPaciente, getPacienteHistorico } from '../api/pacientes';
import { useAuth } from '../contexts/AuthContext';
import type { PatientRecord } from '../types/auth';

export default function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [history, setHistory] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([getPaciente(id, token), getPacienteHistorico(id, token)])
      .then(([record, clinicalHistory]) => {
        setPatient(record);
        setHistory(clinicalHistory);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar o paciente.'));
  }, [id, token]);

  if (error) return <div className="page-wrap"><div className="error-box">{error}</div></div>;
  if (!patient) return <div className="page-wrap"><div className="loading-box">Carregando dados do paciente...</div></div>;

  return <div className="page-wrap patient-details-page"><header className="page-header"><div><p className="eyebrow">Cadastro clínico</p><h2>{patient.nome}</h2><p className="page-subtitle">Dados cadastrais e histórico assistencial.</p></div><div className="detail-actions"><Link className="secondary-button" to={`/pacientes/${patient.id}/editar`}><i className="fas fa-pen" /> Editar</Link><Link className="primary-button" to={`/triagem?pacienteId=${patient.id}`}><i className="fas fa-heartbeat" /> Encaminhar para triagem</Link></div></header><div className="patient-detail-grid"><section className="reference-card detail-card"><h3><i className="fas fa-user" /> Dados pessoais</h3><dl><div><dt>CPF</dt><dd>{patient.cpf}</dd></div><div><dt>CNS</dt><dd>{patient.cns}</dd></div><div><dt>Sexo</dt><dd>{patient.sexo}</dd></div><div><dt>Telefone</dt><dd>{patient.telefone}</dd></div><div><dt>E-mail</dt><dd>{patient.email || 'Não informado'}</dd></div><div><dt>Grupos de risco</dt><dd>{patient.gruposRisco?.join(', ') || 'Nenhum informado'}</dd></div></dl></section><section className="reference-card detail-card"><h3><i className="fas fa-notes-medical" /> Histórico clínico</h3><pre className="history-preview">{history ? JSON.stringify(history, null, 2) : 'Nenhum registro clínico encontrado.'}</pre></section></div></div>;
}
