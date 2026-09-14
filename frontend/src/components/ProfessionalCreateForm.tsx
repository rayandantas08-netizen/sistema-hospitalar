import { useState, type FormEvent } from 'react';
import type { ProfessionalRecord } from '../types/auth';

type ProfessionalKind = 'medico' | 'enfermeiro';

interface ProfessionalCreateFormProps {
  kind: ProfessionalKind;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

const initialForm = {
  nome: '', cpf: '', cns: '', dataNascimento: '', sexo: 'OUTRO', racaCor: 'NAO_DECLARADO',
  escolaridade: 'MEDIO', telefone: '', email: '', senha: '', dataContratacao: '', registro: '',
  unidadeSaudeId: '', endereco: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
};

export function ProfessionalCreateForm({ kind, saving, onSubmit }: ProfessionalCreateFormProps) {
  const [form, setForm] = useState(initialForm);
  const isDoctor = kind === 'medico';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      nome: form.nome,
      cpf: form.cpf,
      cns: form.cns,
      dataNascimento: form.dataNascimento,
      sexo: form.sexo,
      racaCor: form.racaCor,
      escolaridade: form.escolaridade,
      telefone: form.telefone,
      email: form.email,
      senha: form.senha,
      dataContratacao: form.dataContratacao,
      endereco: form.endereco,
      ...(isDoctor ? { crm: form.registro } : { coren: form.registro }),
      unidadeSaudeId: form.unidadeSaudeId || undefined,
    });
    setForm(initialForm);
  }

  const update = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const updateAddress = (field: string, value: string) => setForm((current) => ({
    ...current,
    endereco: { ...current.endereco, [field]: value },
  }));

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <h3>Novo {isDoctor ? 'médico' : 'enfermeiro'}</h3>
      <div className="field-grid">
        <label>Nome<input required value={form.nome} onChange={(event) => update('nome', event.target.value)} /></label>
        <label>CPF<input required maxLength={11} value={form.cpf} onChange={(event) => update('cpf', event.target.value)} /></label>
        <label>CNS<input required maxLength={15} value={form.cns} onChange={(event) => update('cns', event.target.value)} /></label>
        <label>Data de nascimento<input required type="date" value={form.dataNascimento} onChange={(event) => update('dataNascimento', event.target.value)} /></label>
        <label>Sexo<select value={form.sexo} onChange={(event) => update('sexo', event.target.value)}><option value="MASCULINO">Masculino</option><option value="FEMININO">Feminino</option><option value="OUTRO">Outro</option></select></label>
        <label>Raça/Cor<select value={form.racaCor} onChange={(event) => update('racaCor', event.target.value)}><option value="NAO_DECLARADO">Não declarado</option><option value="BRANCA">Branca</option><option value="PRETA">Preta</option><option value="PARDA">Parda</option><option value="AMARELA">Amarela</option><option value="INDIGENA">Indígena</option></select></label>
        <label>Escolaridade<select value={form.escolaridade} onChange={(event) => update('escolaridade', event.target.value)}><option value="FUNDAMENTAL">Fundamental</option><option value="MEDIO">Médio</option><option value="SUPERIOR">Superior</option><option value="POS_GRADUACAO">Pós-graduação</option></select></label>
        <label>Telefone<input required value={form.telefone} onChange={(event) => update('telefone', event.target.value)} /></label>
        <label>E-mail<input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
        <label>Senha<input required minLength={8} type="password" value={form.senha} onChange={(event) => update('senha', event.target.value)} /></label>
        <label>{isDoctor ? 'CRM' : 'COREN'}<input required placeholder={isDoctor ? 'CRM' : '123456-SP'} value={form.registro} onChange={(event) => update('registro', event.target.value)} /></label>
        <label>Data de contratação<input required type="date" value={form.dataContratacao} onChange={(event) => update('dataContratacao', event.target.value)} /></label>
        <label>Unidade de saúde (UUID)<input value={form.unidadeSaudeId} onChange={(event) => update('unidadeSaudeId', event.target.value)} /></label>
        <label>Logradouro<input required value={form.endereco.logradouro} onChange={(event) => updateAddress('logradouro', event.target.value)} /></label>
        <label>Número<input required value={form.endereco.numero} onChange={(event) => updateAddress('numero', event.target.value)} /></label>
        <label>Bairro<input required value={form.endereco.bairro} onChange={(event) => updateAddress('bairro', event.target.value)} /></label>
        <label>Cidade<input required value={form.endereco.cidade} onChange={(event) => updateAddress('cidade', event.target.value)} /></label>
        <label>Estado<input required maxLength={2} value={form.endereco.estado} onChange={(event) => updateAddress('estado', event.target.value)} /></label>
        <label>CEP<input required maxLength={8} value={form.endereco.cep} onChange={(event) => updateAddress('cep', event.target.value)} /></label>
      </div>
      <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : `Salvar ${isDoctor ? 'médico' : 'enfermeiro'}`}</button>
    </form>
  );
}

export type { ProfessionalRecord };
