import { useEffect, useState } from 'react';
import { createMedico, deleteMedico, listMedicos } from '../api/medicos';
import { useAuth } from '../contexts/AuthContext';
import type { ProfessionalRecord } from '../types/auth';
import { ProfessionalCreateForm } from '../components/ProfessionalCreateForm';

export default function MedicosPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<ProfessionalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    listMedicos(token)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(payload: Record<string, unknown>) {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const doctor = await createMedico(payload, token);
      setItems((current) => [doctor, ...current]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o médico.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token || !window.confirm('Deseja desativar este médico?')) return;
    try {
      await deleteMedico(id, token);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível desativar o médico.');
    }
  }

  if (loading) {
    return <div className="page-wrap"><div className="loading-box">Carregando médicos...</div></div>;
  }

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">Equipe</p>
          <h2>Médicos</h2>
          <p className="page-subtitle">Corpo clínico cadastrado na rede hospitalar.</p>
        </div>
        {user?.papel === 'ADMINISTRADOR_PRINCIPAL' ? <button type="button" className="primary-button" onClick={() => setShowForm((current) => !current)}><i className="fas fa-plus" /> {showForm ? 'Fechar' : 'Novo médico'}</button> : null}
      </header>

      {error ? <div className="error-box page-message">{error}</div> : null}
      {showForm ? <ProfessionalCreateForm kind="medico" saving={saving} onSubmit={handleCreate} /> : null}

      <div className="reference-card">
        <div className="reference-toolbar"><div className="search-control"><i className="fas fa-search" /><input placeholder="Buscar por nome ou CRM..." /></div><select><option>Todas as unidades</option></select><select><option>Todos os status</option></select></div>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CRM</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5}>Nenhum médico encontrado.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.crm || '-'}</td>
                  <td>{item.telefone}</td>
                  <td>{item.email || '-'}</td>
                  <td><button type="button" className="table-action" onClick={() => void handleDelete(item.id)}>Desativar</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
