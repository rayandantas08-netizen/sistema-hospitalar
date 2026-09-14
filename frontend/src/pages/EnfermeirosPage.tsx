import { useEffect, useState } from 'react';
import { createEnfermeiro, deleteEnfermeiro, listEnfermeiros } from '../api/enfermeiros';
import { useAuth } from '../contexts/AuthContext';
import type { ProfessionalRecord } from '../types/auth';
import { ProfessionalCreateForm } from '../components/ProfessionalCreateForm';

export default function EnfermeirosPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<ProfessionalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    listEnfermeiros(token)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(payload: Record<string, unknown>) {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const nurse = await createEnfermeiro(payload, token);
      setItems((current) => [nurse, ...current]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o enfermeiro.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token || !window.confirm('Deseja desativar este enfermeiro?')) return;
    try {
      await deleteEnfermeiro(id, token);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível desativar o enfermeiro.');
    }
  }

  if (loading) {
    return <div className="page-wrap"><div className="loading-box">Carregando enfermeiros...</div></div>;
  }

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">Equipe</p>
          <h2>Enfermeiros</h2>
          <p className="page-subtitle">Profissionais de enfermagem cadastrados na rede.</p>
        </div>
        {user?.papel === 'ADMINISTRADOR_PRINCIPAL' ? <button type="button" className="primary-button" onClick={() => setShowForm((current) => !current)}><i className="fas fa-plus" /> {showForm ? 'Fechar' : 'Novo enfermeiro'}</button> : null}
      </header>

      {error ? <div className="error-box page-message">{error}</div> : null}
      {showForm ? <ProfessionalCreateForm kind="enfermeiro" saving={saving} onSubmit={handleCreate} /> : null}

      <div className="reference-card">
        <div className="reference-toolbar"><div className="search-control"><i className="fas fa-search" /><input placeholder="Buscar por nome ou COREN..." /></div><select><option>Todas as unidades</option></select><select><option>Todos os status</option></select></div>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>COREN</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5}>Nenhum enfermeiro encontrado.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.coren || '-'}</td>
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
