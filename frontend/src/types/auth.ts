export type UserRole = 'ADMINISTRADOR_PRINCIPAL' | 'MEDICO' | 'ENFERMEIRO';

export interface AuthUser {
  id: string;
  nome?: string;
  email?: string;
  papel?: UserRole;
  unidadeSaudeId?: string | null;
  unidadeSaudeNome?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  papel: UserRole;
  expires_in?: number;
  user_id: string;
}

export interface RegisterAdminPayload {
  nome: string;
  email: string;
  password: string;
  cpf: string;
  cns: string;
  dataNascimento: string;
  sexo: 'MASCULINO' | 'FEMININO' | 'OUTRO';
  racaCor: 'BRANCA' | 'PRETA' | 'PARDA' | 'AMARELA' | 'INDIGENA' | 'NAO_DECLARADO';
  escolaridade: 'SEM_ESCOLARIDADE' | 'FUNDAMENTAL' | 'MEDIO' | 'SUPERIOR' | 'POS_GRADUACAO';
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  telefone: string;
  adminSecret: string;
}

export interface PatientRecord {
  id: string;
  nome: string;
  cpf: string;
  cns: string;
  dataNascimento: string;
  sexo: string;
  racaCor: string;
  escolaridade: string;
  telefone: string;
  email?: string;
  gruposRisco?: string[];
  consentimentoLGPD?: boolean;
  endereco?: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
}

export interface ProfessionalRecord {
  id: string;
  nome: string;
  cpf: string;
  cns: string;
  email?: string;
  telefone: string;
  papel: UserRole;
  dataContratacao?: string;
  crm?: string;
  coren?: string;
  unidadeSaudeId?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
}
