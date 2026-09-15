import {z} from 'zod';
import {
    EscalaAvpu,
    Escolaridade,
    NivelGravidade,
    PrioridadeChamada,
    RacaCor,
    SetorLeito,
    Sexo,
    StatusChamada,
    StatusLeito,
    StatusPrescricao,
    StatusSala,
    TipoUnidadeSaude
} from './model/Enums';
import {normalizarPrioridade, prioridadeParaNivelGravidade} from './model/Prioridade';

const GRUPOS_RISCO_PERMITIDOS = ['IDOSO', 'GESTANTE', 'DIABETICO', 'HIPERTENSO', 'IMUNOSSUPRIMIDO', 'CRIANCA', 'OBESO', 'ASMATICO'];

export const EnderecoDTO = z.object({
    logradouro: z.string().min(1, 'Logradouro é obrigatório'),
    numero: z.string().min(1, 'Número é obrigatório'),
    bairro: z.string().min(1, 'Bairro é obrigatório'),
    cidade: z.string().min(1, 'Cidade é obrigatória'),
    estado: z.string().min(1, 'Estado é obrigatório'),
    cep: z.string().regex(/^\d{8}$/, 'CEP inválido (deve ter 8 dígitos)'),
});

export const CreateUnidadeSaudeDTO = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    tipo: z.enum([TipoUnidadeSaude.UBS, TipoUnidadeSaude.UPA, TipoUnidadeSaude.Hospital]),
    cnes: z.string().regex(/^\d{7}$/, 'CNES deve ter 7 dígitos'),
    endereco: z.object({
        logradouro: z.string().min(1, 'Logradouro é obrigatório'),
        numero: z.string().min(1, 'Número é obrigatório'),
        complemento: z.string().optional(),
        bairro: z.string().min(1, 'Bairro é obrigatório'),
        cidade: z.string().min(1, 'Cidade é obrigatória'),
        estado: z.string().length(2, 'Estado deve ter 2 caracteres'),
        cep: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
    }),
    telefone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
    servicosEssenciais: z.array(z.string()).min(1, 'Pelo menos um serviço essencial é necessário'),
    servicosAmpliados: z.array(z.string()).optional(),
});

export const UpdateUnidadeSaudeDTO = CreateUnidadeSaudeDTO.partial();

export const CreatePacienteDTO = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    cpf: z.string().regex(/^\d{11}$/, 'CPF inválido (deve ter 11 dígitos)'),
    cns: z.string().regex(/^\d{15}$/, 'CNS inválido (deve ter 15 dígitos)'),
    dataNascimento: z.string().refine((val) => !isNaN(Date.parse(val)), {message: 'Data de nascimento inválida'}),
    sexo: z.nativeEnum(Sexo, {error: 'Sexo inválido'}),
    racaCor: z.nativeEnum(RacaCor, {error: 'Raça/Cor inválida'}),
    escolaridade: z.nativeEnum(Escolaridade, {error: 'Escolaridade inválida'}),
    endereco: EnderecoDTO,
    telefone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido (deve ter 10 ou 11 dígitos)'),
    email: z.string().email('Email inválido').optional(),
    gruposRisco: z
        .array(z.enum(GRUPOS_RISCO_PERMITIDOS as any))
        .optional(),
    consentimentoLGPD: z.boolean({error: 'Consentimento LGPD é obrigatório'}),
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
});

export const UpdatePacienteDTO = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').optional(),
    cpf: z.string().regex(/^\d{11}$/, 'CPF inválido (deve ter 11 dígitos)').optional(),
    cns: z.string().regex(/^\d{15}$/, 'CNS inválido (deve ter 15 dígitos)').optional(),
    dataNascimento: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {message: 'Data de nascimento inválida'})
        .optional(),
    sexo: z.nativeEnum(Sexo, { message: 'Sexo inválido' }).optional(),
    racaCor: z.nativeEnum(RacaCor, { message: 'Raça/Cor inválida' }).optional(),
    escolaridade: z.nativeEnum(Escolaridade, { message: 'Escolaridade inválida' }).optional(),
    endereco: EnderecoDTO.optional(),
    telefone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido (deve ter 10 ou 11 dígitos)').optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    gruposRisco: z
        .array(z.enum(GRUPOS_RISCO_PERMITIDOS as any))
        .min(1, 'Pelo menos um grupo de risco é obrigatório')
        .optional(),
    consentimentoLGPD: z.boolean({error: 'Consentimento LGPD é obrigatório'}).optional(),
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
});

export const CreateMedicoDTO = CreatePacienteDTO.extend({
    dataContratacao: z.string().transform((val) => new Date(val)).refine((val) => !isNaN(val.getTime()), 'Data de contratação inválida'),
    crm: z.string().min(1, 'CRM é obrigatório'),
    senha: z.string().min(5, 'Senha deve ter pelo menos 5 caracteres'),
    email: z.string().email('Email inválido').optional(),
    unidadeSaudeId: z.string().uuid('ID da unidade inválido').optional(),
}).omit({gruposRisco: true, consentimentoLGPD: true});

export const UpdateMedicoDTO = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').optional(),
    crm: z.string().min(1, 'CRM é obrigatório').optional(),
    dataContratacao: z.string().transform((val) => new Date(val)).refine((val) => !isNaN(val.getTime()), 'Data de contratação inválida').optional(),
});

export const CreateEnfermeiroDTO = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
    cns: z.string().regex(/^\d{15}$/, 'CNS deve ter 15 dígitos'),
    dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida'),
    sexo: z.enum(['MASCULINO', 'FEMININO', 'OUTRO'], {message: 'Sexo inválido'}),
    racaCor: z.enum(['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA'], {message: 'Raça/Cor inválida'}),
    escolaridade: z.enum(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR', 'POS_GRADUACAO'], {message: 'Escolaridade inválida'}),
    endereco: z.object({
        logradouro: z.string().min(1, 'Logradouro obrigatório'),
        numero: z.string().min(1, 'Número obrigatório'),
        bairro: z.string().min(1, 'Bairro obrigatório'),
        cidade: z.string().min(1, 'Cidade obrigatória'),
        estado: z.string().length(2, 'Estado deve ter 2 caracteres'),
        cep: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
    }),
    telefone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
    email: z.string().email('Email inválido'),
    senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    dataContratacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de contratação inválida'),
    coren: z.string().regex(/^\d{6}-[A-Z]{2}$/, 'COREN inválido (ex: 123456-SP)'),
    unidadeSaudeId: z.string().uuid('ID da unidade inválido').optional(),
});

export const UpdateEnfermeiroDTO = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').optional(),
    coren: z.string().min(1, 'COREN é obrigatório').optional(),
    dataContratacao: z.string().transform((val) => new Date(val)).refine((val) => !isNaN(val.getTime()), 'Data de contratação inválida').optional(),
});

const CID10_REGEX = /^[A-Z]\d{2}(\.\d{1,2})?$/;

/**
 * PEP estruturado no formato SOAP.
 * `descricao` continua aceito por compatibilidade com o contrato antigo (e é
 * usado pelo lançamento automático de prescrições no prontuário).
 * Pelo menos um dos campos de conteúdo precisa estar presente.
 */
export const CreateProntuarioDTO = z
    .object({
        pacienteId: z.string().uuid('ID do paciente inválido'),
        unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
        dataHora: z
            .string()
            .refine((val) => !isNaN(Date.parse(val)), {message: 'Data/hora inválida'})
            .optional(),
        subjetivo: z.string().min(1, 'Subjetivo não pode ser vazio').optional(),
        objetivo: z.string().min(1, 'Objetivo não pode ser vazio').optional(),
        avaliacao: z.string().min(1, 'Avaliação não pode ser vazia').optional(),
        plano: z.string().min(1, 'Plano não pode ser vazio').optional(),
        descricao: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').optional(),
        cid10: z.string().regex(CID10_REGEX, 'CID-10 inválido (ex.: J45 ou J45.0)').optional(),
        cid10Secundarios: z.array(z.string().regex(CID10_REGEX, 'CID-10 inválido')).optional(),
        assinadoDigitalmente: z.boolean().optional(),
    })
    .refine(
        (dados) => Boolean(dados.subjetivo || dados.objetivo || dados.avaliacao || dados.plano || dados.descricao),
        {message: 'Informe ao menos um campo do prontuário (subjetivo, objetivo, avaliacao, plano ou descricao)'}
    );

export const UpdateProntuarioDTO = z.object({
    subjetivo: z.string().min(1, 'Subjetivo não pode ser vazio').optional(),
    objetivo: z.string().min(1, 'Objetivo não pode ser vazio').optional(),
    avaliacao: z.string().min(1, 'Avaliação não pode ser vazia').optional(),
    plano: z.string().min(1, 'Plano não pode ser vazio').optional(),
    descricao: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').optional(),
    cid10: z.string().regex(CID10_REGEX, 'CID-10 inválido (ex.: J45 ou J45.0)').optional(),
    cid10Secundarios: z.array(z.string().regex(CID10_REGEX, 'CID-10 inválido')).optional(),
    // Assinar é uma ação explícita e irreversível: ao assinar, o backend calcula
    // e grava o certificadoHash (selo de integridade) do conteúdo.
    assinadoDigitalmente: z.boolean().optional(),
});

/**
 * Prescrição estruturada: medicamento + via + posologia + duração.
 * `detalhesPrescricao` (texto livre) e `cid10` seguem aceitos para não quebrar
 * o formulário antigo; `unidadeSaudeId` é opcional porque o backend resolve a
 * unidade do profissional autenticado quando o formulário não envia o campo.
 */
export const CreatePrescricaoDTO = z
    .object({
        pacienteId: z.string().uuid('ID do paciente inválido'),
        unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
        medicamento: z.string().min(2, 'Medicamento deve ter pelo menos 2 caracteres').optional(),
        via: z.string().min(2, 'Via de administração inválida (ex.: Oral, Intravenosa)').optional(),
        posologia: z.string().min(3, 'Posologia deve ter pelo menos 3 caracteres').optional(),
        duracao: z.string().min(1, 'Duração inválida (ex.: 7 dias)').optional(),
        status: z.nativeEnum(StatusPrescricao, {message: 'Status da prescrição inválido'}).optional(),
        prontuarioId: z.string().uuid('ID do prontuário inválido').optional(),
        detalhesPrescricao: z.string().min(10, 'Detalhes da prescrição devem ter pelo menos 10 caracteres').optional(),
        cid10: z.string().regex(CID10_REGEX, 'CID-10 inválido (ex.: J45 ou J45.0)').optional(),
    })
    .refine(
        (dados) => Boolean(dados.detalhesPrescricao || (dados.medicamento && dados.posologia)),
        {message: 'Informe medicamento e posologia (ou o campo detalhesPrescricao)'}
    );

export const UpdatePrescricaoDTO = z.object({
    medicamento: z.string().min(2, 'Medicamento deve ter pelo menos 2 caracteres').optional(),
    via: z.string().min(2, 'Via de administração inválida').optional(),
    posologia: z.string().min(3, 'Posologia deve ter pelo menos 3 caracteres').optional(),
    duracao: z.string().min(1, 'Duração inválida').optional(),
    status: z.nativeEnum(StatusPrescricao, {message: 'Status da prescrição inválido'}).optional(),
    detalhesPrescricao: z.string().min(10, 'Detalhes da prescrição devem ter pelo menos 10 caracteres').optional(),
    cid10: z.string().regex(CID10_REGEX, 'CID-10 inválido (ex.: J45 ou J45.0)').optional(),
});

export const CreateConsultaDTO = z.object({
    pacienteId: z.string().uuid('ID do paciente inválido'),
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido'),
    observacoes: z.string().min(10, 'Observações devem ter pelo menos 10 caracteres'),
    cid10: z.string().regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, 'CID-10 inválido (ex.: J45 ou J45.0)').optional(),
});

export const UpdateConsultaDTO = z.object({
    observacoes: z.string().min(10, 'Observações devem ter pelo menos 10 caracteres').optional(),
    cid10: z.string().regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, 'CID-10 inválido (ex.: J45 ou J45.0)').optional(),
});

const SinaisVitaisSchema = z.object({
    pressaoArterialSistolica: z.number(),
    pressaoArterialDiastolica: z.number(),
    frequenciaCardiaca: z.number(),
    frequenciaRespiratoria: z.number(),
    temperatura: z.number(),
    saturacaoOxigenio: z.number(),
    nivelDor: z.number(),
    estadoConsciente: z.boolean(),
    // AVPU alimenta o escore MEWS. Opcional: se não vier, o backend deriva de
    // `estadoConsciente` (ver MewsService.derivarAvpu).
    escalaAvpu: z.nativeEnum(EscalaAvpu, {message: 'Escala AVPU inválida'}).optional(),
});

const NivelGravidadeSchema = z.nativeEnum(NivelGravidade).refine(
    (val) => Object.values(NivelGravidade).includes(val),
    { message: 'Nível de gravidade inválido' }
);

export const CreateTriagemDTO = z.object({
    pacienteId: z.string().uuid('ID do paciente inválido'),
    enfermeiroId: z.string().uuid('ID do enfermeiro inválido'),
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido'),
    nivelGravidade: NivelGravidadeSchema.optional(),
    sinaisVitais: SinaisVitaisSchema,
    queixaPrincipal: z.string().min(1, 'Queixa principal é obrigatória'),
});

export const UpdateTriagemDTO = CreateTriagemDTO.partial();

// ---------------------------------------------------------------------------
// Paginação e filtros (query strings)
// ---------------------------------------------------------------------------
/**
 * Aceita `pagina/limite` (padrão da API) e também `page/limit` (convenção muito
 * comum no frontend), para o frontend não precisar saber qual usamos.
 * Use `resolverPaginacao()` de `core/utils/paginacao.ts` para ler o resultado.
 */
/**
 * Lê um inteiro vindo da query string tratando "vazio" como ausente.
 * `z.coerce.number()` sozinho converteria `?pagina=` em 0 e quebraria a
 * validação com um erro confuso.
 */
const InteiroQueryOpcional = (minimo: number, maximo: number) =>
    z.preprocess(
        (valor) => (valor === '' || valor === null || valor === undefined ? undefined : Number(valor)),
        z
            .number({error: 'Valor numérico inválido'})
            .int('Valor deve ser um número inteiro')
            .min(minimo, `Valor mínimo é ${minimo}`)
            .max(maximo, `Valor máximo é ${maximo}`)
            .optional()
    );

/** `?incluirInativas=false` precisa virar `false` (Boolean('false') === true!). */
const BooleanQueryOpcional = z.preprocess((valor) => {
    if (valor === '' || valor === null || valor === undefined) return undefined;
    if (typeof valor === 'boolean') return valor;
    return valor === 'true' || valor === '1';
}, z.boolean().optional());

export const PaginacaoQueryDTO = z.object({
    pagina: InteiroQueryOpcional(1, 100000),
    page: InteiroQueryOpcional(1, 100000),
    limite: InteiroQueryOpcional(1, 200),
    limit: InteiroQueryOpcional(1, 200),
});

export const ClassificacaoRiscoSchema = z
    .string()
    .refine((valor) => normalizarPrioridade(valor) !== null, {
        message: 'Classificação inválida (Vermelho, Laranja, Amarelo, Verde, Azul)',
    })
    .transform((valor) => prioridadeParaNivelGravidade(valor) as NivelGravidade);

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------
export const CreateSalaDTO = z.object({
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido'),
    nome: z.string().min(2, 'Nome da sala deve ter pelo menos 2 caracteres'),
    tipo: z.string().min(2, 'Tipo da sala é obrigatório'),
    responsavelId: z.string().uuid('ID do responsável inválido').nullable().optional(),
    status: z.nativeEnum(StatusSala, {message: 'Status da sala inválido'}).optional(),
});

export const UpdateSalaDTO = z.object({
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    nome: z.string().min(2, 'Nome da sala deve ter pelo menos 2 caracteres').optional(),
    tipo: z.string().min(2, 'Tipo da sala é obrigatório').optional(),
    // null limpa o responsável da sala
    responsavelId: z.string().uuid('ID do responsável inválido').nullable().optional(),
    status: z.nativeEnum(StatusSala, {message: 'Status da sala inválido'}).optional(),
});

export const ListSalasQueryDTO = PaginacaoQueryDTO.extend({
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    status: z.nativeEnum(StatusSala, {message: 'Status da sala inválido'}).optional(),
    tipo: z.string().optional(),
    incluirInativas: BooleanQueryOpcional,
});

// ---------------------------------------------------------------------------
// Chamadas de pacientes (painel de TV)
// ---------------------------------------------------------------------------
const PrioridadeChamadaSchema = z
    .string()
    .refine((valor) => normalizarPrioridade(valor) !== null, {
        message: 'Prioridade inválida (Vermelho, Laranja, Amarelo, Verde, Azul)',
    })
    .transform((valor) => normalizarPrioridade(valor) as PrioridadeChamada);

export const ChamarPacienteDTO = z
    .object({
        // Basta informar um dos dois: o paciente direto ou a triagem de origem
        pacienteId: z.string().uuid('ID do paciente inválido').optional(),
        triagemId: z.string().uuid('ID da triagem inválido').optional(),
        // A sala pode vir por id ou pelo nome (o painel exibe o nome)
        salaId: z.string().uuid('ID da sala inválido').optional(),
        sala: z.string().min(1, 'Nome da sala não pode ser vazio').optional(),
        senha: z.string().min(1, 'Senha não pode ser vazia').max(10, 'Senha deve ter no máximo 10 caracteres').optional(),
        prioridade: PrioridadeChamadaSchema.optional(),
        profissionalId: z.string().uuid('ID do profissional inválido').optional(),
        unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    })
    .refine((dados) => Boolean(dados.pacienteId || dados.triagemId), {
        message: 'Informe pacienteId ou triagemId',
    })
    .refine((dados) => Boolean(dados.salaId || dados.sala), {
        message: 'Informe salaId ou o nome da sala',
    });

export const FinalizarChamadaDTO = z.object({
    status: z
        .nativeEnum(StatusChamada, {message: 'Status inválido'})
        .refine((valor) => valor === StatusChamada.FINALIZADO || valor === StatusChamada.CANCELADO, {
            message: 'Status deve ser FINALIZADO ou CANCELADO',
        })
        .optional(),
    atendidoEm: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {message: 'Data de atendimento inválida'})
        .optional(),
});

export const ListChamadasQueryDTO = PaginacaoQueryDTO.extend({
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    status: z.nativeEnum(StatusChamada, {message: 'Status inválido'}).optional(),
    classificacaoRisco: ClassificacaoRiscoSchema.optional(),
});

export const FilaChamadasQueryDTO = PaginacaoQueryDTO.extend({
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    classificacaoRisco: ClassificacaoRiscoSchema.optional(),
    mewsMinimo: InteiroQueryOpcional(0, 14),
});

export const UltimasChamadasQueryDTO = z.object({
    limite: InteiroQueryOpcional(1, 50),
    limit: InteiroQueryOpcional(1, 50),
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
});

// ---------------------------------------------------------------------------
// Leitos
// ---------------------------------------------------------------------------
export const CreateLeitoDTO = z.object({
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido'),
    nomeOuNumero: z.string().min(1, 'Nome ou número do leito é obrigatório'),
    setor: z.nativeEnum(SetorLeito, {message: 'Setor inválido'}).optional(),
    status: z.nativeEnum(StatusLeito, {message: 'Status do leito inválido'}).optional(),
    pacienteId: z.string().uuid('ID do paciente inválido').nullable().optional(),
    ventiladorMecanico: z.boolean().optional(),
    monitorCardiaco: z.boolean().optional(),
    diagnostico: z.string().nullable().optional(),
});

export const UpdateLeitoDTO = z.object({
    nomeOuNumero: z.string().min(1, 'Nome ou número do leito é obrigatório').optional(),
    setor: z.nativeEnum(SetorLeito, {message: 'Setor inválido'}).optional(),
    status: z.nativeEnum(StatusLeito, {message: 'Status do leito inválido'}).optional(),
    pacienteId: z.string().uuid('ID do paciente inválido').nullable().optional(),
    ventiladorMecanico: z.boolean().optional(),
    monitorCardiaco: z.boolean().optional(),
    diagnostico: z.string().nullable().optional(),
});

/**
 * PATCH /api/leitos/:id/status
 * Atualiza o status do leito. Para internação, `pacienteId` (e opcionalmente
 * `diagnostico`) podem acompanhar o status OCUPADO; ao liberar (LIVRE) o
 * backend limpa paciente e diagnóstico do leito.
 */
export const UpdateLeitoStatusDTO = z
    .object({
        status: z.nativeEnum(StatusLeito, {message: 'Status do leito inválido'}),
        pacienteId: z.string().uuid('ID do paciente inválido').nullable().optional(),
        diagnostico: z.string().nullable().optional(),
    })
    .refine(
        (dados) => dados.status !== StatusLeito.OCUPADO || Boolean(dados.pacienteId),
        {message: 'Para ocupar o leito é necessário informar pacienteId (ou usar PUT /api/leitos/:id)'}
    );

export const ListLeitosQueryDTO = PaginacaoQueryDTO.extend({
    setor: z.nativeEnum(SetorLeito, {message: 'Setor inválido'}).optional(),
    status: z.nativeEnum(StatusLeito, {message: 'Status do leito inválido'}).optional(),
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    incluirInativos: BooleanQueryOpcional,
});

// ---------------------------------------------------------------------------
// Triagens (listagem paginada) e fila da Sala Vermelha
// ---------------------------------------------------------------------------
export const ListTriagensQueryDTO = PaginacaoQueryDTO.extend({
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    classificacaoRisco: ClassificacaoRiscoSchema.optional(),
    pacienteId: z.string().uuid('ID do paciente inválido').optional(),
    mewsMinimo: InteiroQueryOpcional(0, 14),
});

export const FilaSalaVermelhaQueryDTO = PaginacaoQueryDTO.extend({
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
});

// ---------------------------------------------------------------------------
// Prontuários (PEP SOAP) — filtros da listagem
// ---------------------------------------------------------------------------
export const ListProntuariosQueryDTO = PaginacaoQueryDTO.extend({
    pacienteId: z.string().uuid('ID do paciente inválido').optional(),
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    profissionalId: z.string().uuid('ID do profissional inválido').optional(),
    cid10: z.string().optional(),
    apenasAssinados: BooleanQueryOpcional,
});

// ---------------------------------------------------------------------------
// Prescrições — filtros da listagem
// ---------------------------------------------------------------------------
export const ListPrescricoesQueryDTO = PaginacaoQueryDTO.extend({
    pacienteId: z.string().uuid('ID do paciente inválido').optional(),
    unidadeSaudeId: z.string().uuid('ID da unidade de saúde inválido').optional(),
    profissionalId: z.string().uuid('ID do profissional inválido').optional(),
    status: z.nativeEnum(StatusPrescricao, {message: 'Status da prescrição inválido'}).optional(),
});

export type CreateUnidadeSaudeDTO = z.infer<typeof CreateUnidadeSaudeDTO>;
export type UpdateUnidadeSaudeDTO = z.infer<typeof UpdateUnidadeSaudeDTO>;
export type CreatePacienteDTO = z.infer<typeof CreatePacienteDTO>;
export type UpdatePacienteDTO = z.infer<typeof UpdatePacienteDTO>;
export type CreateMedicoDTO = z.infer<typeof CreateMedicoDTO>;
export type UpdateMedicoDTO = z.infer<typeof UpdateMedicoDTO>;
export type CreateEnfermeiroDTO = z.infer<typeof CreateEnfermeiroDTO>;
export type UpdateEnfermeiroDTO = z.infer<typeof UpdateEnfermeiroDTO>;
export type CreateProntuarioDTO = z.infer<typeof CreateProntuarioDTO>;
export type UpdateProntuarioDTO = z.infer<typeof UpdateProntuarioDTO>;
export type CreatePrescricaoDTO = z.infer<typeof CreatePrescricaoDTO>;
export type UpdatePrescricaoDTO = z.infer<typeof UpdatePrescricaoDTO>;
export type CreateConsultaDTO = z.infer<typeof CreateConsultaDTO>;
export type CreateTriagemDTO = z.infer<typeof CreateTriagemDTO>;
export type UpdateTriagemDTO = z.infer<typeof UpdateTriagemDTO>;
export type CreateSalaDTO = z.infer<typeof CreateSalaDTO>;
export type UpdateSalaDTO = z.infer<typeof UpdateSalaDTO>;
export type ListSalasQueryDTO = z.infer<typeof ListSalasQueryDTO>;
export type ChamarPacienteDTO = z.infer<typeof ChamarPacienteDTO>;
export type FinalizarChamadaDTO = z.infer<typeof FinalizarChamadaDTO>;
export type ListChamadasQueryDTO = z.infer<typeof ListChamadasQueryDTO>;
export type FilaChamadasQueryDTO = z.infer<typeof FilaChamadasQueryDTO>;
export type CreateLeitoDTO = z.infer<typeof CreateLeitoDTO>;
export type UpdateLeitoDTO = z.infer<typeof UpdateLeitoDTO>;
export type UpdateLeitoStatusDTO = z.infer<typeof UpdateLeitoStatusDTO>;
export type ListLeitosQueryDTO = z.infer<typeof ListLeitosQueryDTO>;
export type ListTriagensQueryDTO = z.infer<typeof ListTriagensQueryDTO>;
export type ListProntuariosQueryDTO = z.infer<typeof ListProntuariosQueryDTO>;
export type ListPrescricoesQueryDTO = z.infer<typeof ListPrescricoesQueryDTO>;
export type PaginacaoQueryDTO = z.infer<typeof PaginacaoQueryDTO>;