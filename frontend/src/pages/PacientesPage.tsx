import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createPaciente, deletePaciente, listPacientes } from '../api/pacientes';
import { useAuth } from '../contexts/AuthContext';
import type { PatientRecord } from '../types/auth';

const emptyForm = {
  nome: '', cpf: '', cns: '', dataNascimento: '', sexo: 'OUTRO', racaCor: 'NAO_DECLARADO',
  escolaridade: 'MEDIO', telefone: '', email: '', unidadeSaudeId: '', consentimentoLGPD: false,
  endereco: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
};

export default function PacientesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;

    listPacientes(token)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const patient = await createPaciente({ ...form, unidadeSaudeId: form.unidadeSaudeId || undefined }, token);
      setItems((current) => [patient, ...current]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o paciente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token || !window.confirm('Deseja desativar este paciente?')) return;
    try {
      await deletePaciente(id, token);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível desativar o paciente.');
    }
  }

  if (loading) {
    return <div className="page-wrap"><div className="loading-box">Carregando pacientes...</div></div>;
  }

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">Cadastros</p>
          <h2>Pacientes</h2>
          <p className="page-subtitle">Acompanhe os pacientes ativos e seus grupos de risco.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setShowForm((current) => !current)}>
          <i className="fas fa-plus" />
          {showForm ? 'Fechar' : 'Novo paciente'}
        </button>
      </header>

      {error ? <div className="error-box page-message">{error}</div> : null}
      {showForm ? (
        <form className="panel form-panel" onSubmit={handleCreate}>
          <h3>Novo paciente</h3>
          <div className="field-grid">
            <label>Nome<input required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></label>
            <label>CPF<input required maxLength={11} value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} /></label>
            <label>CNS<input required maxLength={15} value={form.cns} onChange={(event) => setForm({ ...form, cns: event.target.value })} /></label>
            <label>Data de nascimento<input required type="date" value={form.dataNascimento} onChange={(event) => setForm({ ...form, dataNascimento: event.target.value })} /></label>
            <label>Sexo<select value={form.sexo} onChange={(event) => setForm({ ...form, sexo: event.target.value })}><option value="MASCULINO">Masculino</option><option value="FEMININO">Feminino</option><option value="OUTRO">Outro</option></select></label>
            <label>Raça/Cor<select value={form.racaCor} onChange={(event) => setForm({ ...form, racaCor: event.target.value })}><option value="NAO_DECLARADO">Não declarado</option><option value="BRANCA">Branca</option><option value="PRETA">Preta</option><option value="PARDA">Parda</option><option value="AMARELA">Amarela</option><option value="INDIGENA">Indígena</option></select></label>
            <label>Escolaridade<select value={form.escolaridade} onChange={(event) => setForm({ ...form, escolaridade: event.target.value })}><option value="FUNDAMENTAL">Fundamental</option><option value="MEDIO">Médio</option><option value="SUPERIOR">Superior</option><option value="POS_GRADUACAO">Pós-graduação</option></select></label>
            <label>Telefone<input required value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} /></label>
            <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Unidade de saúde (UUID)<input value={form.unidadeSaudeId} onChange={(event) => setForm({ ...form, unidadeSaudeId: event.target.value })} /></label>
            <label>Logradouro<input required value={form.endereco.logradouro} onChange={(event) => setForm({ ...form, endereco: { ...form.endereco, logradouro: event.target.value } })} /></label>
            <label>Número<input required value={form.endereco.numero} onChange={(event) => setForm({ ...form, endereco: { ...form.endereco, numero: event.target.value } })} /></label>
            <label>Bairro<input required value={form.endereco.bairro} onChange={(event) => setForm({ ...form, endereco: { ...form.endereco, bairro: event.target.value } })} /></label>
            <label>Cidade<input required value={form.endereco.cidade} onChange={(event) => setForm({ ...form, endereco: { ...form.endereco, cidade: event.target.value } })} /></label>
            <label>Estado<input required maxLength={2} value={form.endereco.estado} onChange={(event) => setForm({ ...form, endereco: { ...form.endereco, estado: event.target.value } })} /></label>
            <label>CEP<input required maxLength={8} value={form.endereco.cep} onChange={(event) => setForm({ ...form, endereco: { ...form.endereco, cep: event.target.value } })} /></label>
          </div>
          <label className="checkbox-field"><input type="checkbox" checked={form.consentimentoLGPD} onChange={(event) => setForm({ ...form, consentimentoLGPD: event.target.checked })} /> Consentimento LGPD</label>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar paciente'}</button>
        </form>
      ) : null}

      <div className="reference-card">
        <div className="reference-toolbar"><div className="search-control"><i className="fas fa-search" /><input placeholder="Buscar por nome, CPF ou CNS..." /></div><select><option>Todas as unidades</option></select><select><option>Todos os riscos</option></select><select><option>Todos os status</option></select></div>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Sexo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5}>Nenhum paciente encontrado.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.cpf}</td>
                  <td>{item.telefone}</td>
                  <td>{item.sexo}</td>
                  <td><div className="patient-actions"><Link to={`/pacientes/${item.id}`} title="Visualizar"><i className="fas fa-eye" /></Link><Link to={`/pacientes/${item.id}/editar`} title="Editar"><i className="fas fa-pen" /></Link><Link to={`/triagem?pacienteId=${item.id}`} title="Encaminhar para triagem"><i className="fas fa-heartbeat" /></Link><button type="button" className="table-action" onClick={() => void handleDelete(item.id)} title="Desativar"><i className="fas fa-ban" /></button></div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
