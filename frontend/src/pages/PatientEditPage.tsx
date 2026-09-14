import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPaciente, updatePaciente } from '../api/pacientes';
import { useAuth } from '../contexts/AuthContext';
import type { PatientRecord } from '../types/auth';

export default function PatientEditPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<PatientRecord>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    getPaciente(id, token).then(setForm).catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar o paciente.'));
  }, [id, token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !id) return;
    setSaving(true);
    setError('');
    try {
      await updatePaciente(id, { nome: form.nome, telefone: form.telefone, email: form.email }, token);
      navigate(`/pacientes/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o paciente.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="page-wrap patient-edit-page"><header className="page-header"><div><p className="eyebrow">Cadastro clínico</p><h2>Editar paciente</h2><p className="page-subtitle">Atualize os dados de contato sem alterar o histórico clínico.</p></div><Link className="secondary-button" to={id ? `/pacientes/${id}` : '/pacientes'}>Cancelar</Link></header><form className="reference-card edit-form" onSubmit={submit}><label>Nome<input required value={form.nome || ''} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></label><label>Telefone<input required value={form.telefone || ''} onChange={(event) => setForm({ ...form, telefone: event.target.value })} /></label><label>E-mail<input type="email" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>{error ? <div className="error-box">{error}</div> : null}<button className="primary-button" disabled={saving}><i className="fas fa-check" /> {saving ? 'Salvando...' : 'Salvar alterações'}</button></form></div>;
}
