import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerAdmin } from '../api/auth';
import type { RegisterAdminPayload } from '../types/auth';

const defaultValues: RegisterAdminPayload = {
  nome: 'Administrador Hospitalar',
  email: 'admin@hospitalar.com',
  password: 'Hospitalar@123',
  cpf: '12345678909',
  cns: '123456789012345',
  dataNascimento: '1990-01-01',
  sexo: 'MASCULINO',
  racaCor: 'BRANCA',
  escolaridade: 'SUPERIOR',
  telefone: '11999999999',
  adminSecret: '',
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '120',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01000000',
  },
};

export default function RegisterAdminPage() {
  const [form, setForm] = useState<RegisterAdminPayload>(defaultValues);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function updateField<K extends keyof RegisterAdminPayload>(field: K, value: RegisterAdminPayload[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateAddress(field: string, value: string) {
    setForm((current) => ({
      ...current,
      endereco: {
        ...current.endereco,
        [field]: value,
      },
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await registerAdmin(form);
      setSuccess('Administrador cadastrado com sucesso. Você pode entrar agora.');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o administrador.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen narrow">
      <div className="auth-card wide">
        <div className="auth-header compact">
          <div className="brand-mark large">H</div>
          <h1>Cadastro de administrador</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form split-form">
          <label>
            Nome
            <input value={form.nome} onChange={(event) => updateField('nome', event.target.value)} />
          </label>

          <label>
            E-mail
            <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </label>

          <label>
            Senha
            <input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} />
          </label>

          <label>
            CPF
            <input value={form.cpf} onChange={(event) => updateField('cpf', event.target.value)} />
          </label>

          <label>
            CNS
            <input value={form.cns} onChange={(event) => updateField('cns', event.target.value)} />
          </label>

          <label>
            Data de nascimento
            <input type="date" value={form.dataNascimento} onChange={(event) => updateField('dataNascimento', event.target.value)} />
          </label>

          <label>
            Sexo
            <select value={form.sexo} onChange={(event) => updateField('sexo', event.target.value as RegisterAdminPayload['sexo'])}>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>

          <label>
            Raça/Cor
            <select value={form.racaCor} onChange={(event) => updateField('racaCor', event.target.value as RegisterAdminPayload['racaCor'])}>
              <option value="NAO_DECLARADO">Não declarado</option>
              <option value="BRANCA">Branca</option>
              <option value="PRETA">Preta</option>
              <option value="PARDA">Parda</option>
              <option value="AMARELA">Amarela</option>
              <option value="INDIGENA">Indígena</option>
            </select>
          </label>

          <label>
            Escolaridade
            <select value={form.escolaridade} onChange={(event) => updateField('escolaridade', event.target.value as RegisterAdminPayload['escolaridade'])}>
              <option value="SEM_ESCOLARIDADE">Sem escolaridade</option>
              <option value="FUNDAMENTAL">Fundamental</option>
              <option value="MEDIO">Médio</option>
              <option value="SUPERIOR">Superior</option>
              <option value="POS_GRADUACAO">Pós-graduação</option>
            </select>
          </label>

          <label>
            Telefone
            <input value={form.telefone} onChange={(event) => updateField('telefone', event.target.value)} />
          </label>

          <label>
            Senha especial do administrador
            <input required type="password" value={form.adminSecret} onChange={(event) => updateField('adminSecret', event.target.value)} placeholder="Valor de ADMIN_SECRET" />
          </label>

          <label>
            Logradouro
            <input value={form.endereco.logradouro} onChange={(event) => updateAddress('logradouro', event.target.value)} />
          </label>

          <label>
            Número
            <input value={form.endereco.numero} onChange={(event) => updateAddress('numero', event.target.value)} />
          </label>

          <label>
            Bairro
            <input value={form.endereco.bairro} onChange={(event) => updateAddress('bairro', event.target.value)} />
          </label>

          <label>
            Cidade
            <input value={form.endereco.cidade} onChange={(event) => updateAddress('cidade', event.target.value)} />
          </label>

          <label>
            Estado
            <input value={form.endereco.estado} onChange={(event) => updateAddress('estado', event.target.value)} />
          </label>

          <label>
            CEP
            <input value={form.endereco.cep} onChange={(event) => updateAddress('cep', event.target.value)} />
          </label>

          {error ? <div className="error-box full-span">{error}</div> : null}
          {success ? <div className="success-box full-span">{success}</div> : null}

          <button type="submit" disabled={loading} className="full-span">
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/">Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
}
