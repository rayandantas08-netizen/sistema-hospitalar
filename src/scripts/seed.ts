import dotenv from 'dotenv';
dotenv.config();

import {supabaseServiceClient} from '../shared/database/supabase';
import {Papeis, TipoUnidadeSaude} from '../modulo/core/model/Enums';

/**
 * ============================================================================
 * Seed inicial do Sistema Hospitalar
 * ============================================================================
 * Uso:  npm run seed
 *
 * O que este script faz (somente se o banco estiver vazio, é idempotente):
 *   1. Unidade hospitalar "Hospital Central de Clínicas"
 *   2. 4 salas (Consultório 01, 03, 05 e Sala Vermelha)
 *   3. 6 leitos na Sala Vermelha (Leito 01..06)
 *   4. Usuário ADMINISTRADOR_PRINCIPAL
 *
 * Por que o administrador é criado AQUI e não em SQL:
 *   No Supabase a senha não fica na tabela `funcionario` — ela vive em
 *   `auth.users` e é gerada/validada pelo GoTrue, que usa **bcrypt** para
 *   encriptar a senha (é isso que aparece em auth.users.encrypted_password).
 *   Criar esse usuário exige a service-role key e a API de admin do Auth, o
 *   que só é possível a partir de código — por isso `npm run seed`.
 *   A estrutura física (unidade/salas/leitos) também está na migration
 *   `20260915000200_seed_infraestrutura_inicial.sql`, então o banco já nasce
 *   utilizável mesmo sem rodar este script.
 *
 * Variáveis de ambiente usadas (obrigatórias apenas para criar o admin):
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 * Opcionais: SEED_ADMIN_NOME, SEED_ADMIN_CPF, SEED_ADMIN_CNS, SEED_ADMIN_TELEFONE
 */

const UNIDADE_SEED = {
    nome: 'Hospital Central de Clínicas',
    tipo: TipoUnidadeSaude.Hospital,
    cnes: '1234567',
    endereco: {
        logradouro: 'Avenida Central',
        numero: '1200',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01001000',
    },
    telefone: '1130001000',
    servicosEssenciais: [
        'Pronto-socorro',
        'Internação',
        'Exames laboratoriais',
        'Radiologia',
        'Farmácia',
        'Emergência',
    ],
    servicosAmpliados: ['UTI adulto', 'Cirurgia geral', 'Pediatria'],
};

const SALAS_SEED = [
    {nome: 'Consultório 01 (Clínica Geral)', tipo: 'Consultório médico'},
    {nome: 'Consultório 03 (Clínica Médica)', tipo: 'Consultório médico'},
    {nome: 'Consultório 05 (Pediatria)', tipo: 'Consultório médico'},
    {nome: 'Sala Vermelha (Emergência)', tipo: 'Emergência'},
];

const LEITOS_SEED = [
    {nomeOuNumero: 'Leito 01', ventiladorMecanico: true},
    {nomeOuNumero: 'Leito 02', ventiladorMecanico: true},
    {nomeOuNumero: 'Leito 03', ventiladorMecanico: false},
    {nomeOuNumero: 'Leito 04', ventiladorMecanico: false},
    {nomeOuNumero: 'Leito 05', ventiladorMecanico: false},
    {nomeOuNumero: 'Leito 06', ventiladorMecanico: false},
];

const supabase = supabaseServiceClient;

async function contar(tabela: string, filtros: Record<string, any> = {}): Promise<number> {
    let consulta = supabase.from(tabela).select('id', {count: 'exact', head: true});
    for (const [campo, valor] of Object.entries(filtros)) {
        consulta = consulta.eq(campo, valor);
    }
    const {count, error} = await consulta;
    if (error) throw new Error(`Erro ao contar ${tabela}: ${error.message}`);
    return count ?? 0;
}

// ---------------------------------------------------------------------------
// 1-3. Unidade, salas e leitos
// ---------------------------------------------------------------------------
async function seedInfraestrutura(): Promise<string | null> {
    let unidadeId: string | null = null;

    const {data: unidadeExistente} = await supabase
        .from('unidade_saude')
        .select('id')
        .eq('cnes', UNIDADE_SEED.cnes)
        .maybeSingle();

    if (unidadeExistente) {
        unidadeId = unidadeExistente.id;
        console.log(`• Unidade já existe: ${UNIDADE_SEED.nome}`);
    } else {
        const {data, error} = await supabase
            .from('unidade_saude')
            .insert({
                nome: UNIDADE_SEED.nome,
                tipo: UNIDADE_SEED.tipo,
                cnes: UNIDADE_SEED.cnes,
                endereco_logradouro: UNIDADE_SEED.endereco.logradouro,
                endereco_numero: UNIDADE_SEED.endereco.numero,
                endereco_bairro: UNIDADE_SEED.endereco.bairro,
                endereco_cidade: UNIDADE_SEED.endereco.cidade,
                endereco_estado: UNIDADE_SEED.endereco.estado,
                endereco_cep: UNIDADE_SEED.endereco.cep,
                telefone: UNIDADE_SEED.telefone,
                servicos_essenciais: UNIDADE_SEED.servicosEssenciais,
                servicos_ampliados: UNIDADE_SEED.servicosAmpliados,
                ativo: true,
            })
            .select('id')
            .single();

        if (error || !data) {
            throw new Error(`Erro ao criar unidade: ${error?.message}`);
        }
        unidadeId = data.id;
        console.log(`• Unidade criada: ${UNIDADE_SEED.nome} (${unidadeId})`);
    }

    // --- Salas -------------------------------------------------------------
    const {data: salasExistentes} = await supabase
        .from('sala')
        .select('nome')
        .eq('unidade_saude_id', unidadeId)
        .eq('ativo', true);

    const nomesExistentes = new Set((salasExistentes ?? []).map((sala: any) => String(sala.nome).toLowerCase()));
    const salasParaInserir = SALAS_SEED.filter((sala) => !nomesExistentes.has(sala.nome.toLowerCase()));

    if (salasParaInserir.length > 0) {
        const {error} = await supabase.from('sala').insert(
            salasParaInserir.map((sala) => ({
                unidade_saude_id: unidadeId,
                nome: sala.nome,
                tipo: sala.tipo,
                status: 'LIVRE',
                ativo: true,
            }))
        );
        if (error) throw new Error(`Erro ao criar salas: ${error.message}`);
        console.log(`• Salas criadas: ${salasParaInserir.map((s) => s.nome).join(', ')}`);
    } else {
        console.log('• Salas já existem (nenhuma criada)');
    }

    // --- Leitos da Sala Vermelha -------------------------------------------
    const {data: leitosExistentes} = await supabase
        .from('leito')
        .select('nome_ou_numero')
        .eq('unidade_saude_id', unidadeId)
        .eq('setor', 'SALA_VERMELHA')
        .eq('ativo', true);

    const leitosJaCriados = new Set(
        (leitosExistentes ?? []).map((leito: any) => String(leito.nome_ou_numero).toLowerCase())
    );
    const leitosParaInserir = LEITOS_SEED.filter((leito) => !leitosJaCriados.has(leito.nomeOuNumero.toLowerCase()));

    if (leitosParaInserir.length > 0) {
        const {error} = await supabase.from('leito').insert(
            leitosParaInserir.map((leito) => ({
                unidade_saude_id: unidadeId,
                nome_ou_numero: leito.nomeOuNumero,
                setor: 'SALA_VERMELHA',
                status: 'LIVRE',
                ventilador_mecanico: leito.ventiladorMecanico,
                monitor_cardiaco: true,
                ativo: true,
            }))
        );
        if (error) throw new Error(`Erro ao criar leitos: ${error.message}`);
        console.log(`• Leitos da Sala Vermelha criados: ${leitosParaInserir.map((l) => l.nomeOuNumero).join(', ')}`);
    } else {
        console.log('• Leitos da Sala Vermelha já existem (nenhum criado)');
    }

    return unidadeId;
}

// ---------------------------------------------------------------------------
// 4. Administrador principal
// ---------------------------------------------------------------------------
async function seedAdministrador(unidadeId: string | null): Promise<void> {
    const totalAdmins = await contar('funcionario', {papel: Papeis.ADMINISTRADOR_PRINCIPAL, ativo: true});
    if (totalAdmins > 0) {
        console.log('• Administrador principal já existe (nenhum criado)');
        return;
    }

    const email = process.env.SEED_ADMIN_EMAIL;
    // A senha é encriptada em bcrypt pelo GoTrue (auth.users.encrypted_password).
    // Nunca usamos senha padrão no código: isso viraria uma porta de entrada.
    const senha = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !senha) {
        console.warn(
            '\n⚠️  Administrador NÃO criado: defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD.\n' +
                '   Exemplo:\n' +
                '     SEED_ADMIN_EMAIL=admin@hospital.com SEED_ADMIN_PASSWORD="SenhaForte#2026" npm run seed\n' +
                '   (a senha será encriptada em bcrypt pelo Supabase Auth)'
        );
        return;
    }
    if (senha.length < 8) {
        throw new Error('SEED_ADMIN_PASSWORD deve ter pelo menos 8 caracteres');
    }

    const nome = process.env.SEED_ADMIN_NOME ?? 'Administrador Principal';
    const cpf = process.env.SEED_ADMIN_CPF ?? '00000000191';
    const cns = process.env.SEED_ADMIN_CNS ?? '000000000000001';
    const telefone = process.env.SEED_ADMIN_TELEFONE ?? '11900000000';

    const {data: duplicado} = await supabase
        .from('funcionario')
        .select('id')
        .or(`email.eq.${email},cpf.eq.${cpf},cns.eq.${cns}`)
        .limit(1);

    if (duplicado && duplicado.length > 0) {
        throw new Error('Email, CPF ou CNS do administrador já cadastrado em outro funcionário');
    }

    const {data: authUser, error: authError} = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {nome, papel: Papeis.ADMINISTRADOR_PRINCIPAL},
    });

    if (authError || !authUser?.user) {
        throw new Error(`Erro ao criar usuário no Auth: ${authError?.message ?? 'desconhecido'}`);
    }

    const {error: insertError} = await supabase.from('funcionario').insert({
        id: authUser.user.id,
        nome,
        email,
        cpf,
        cns,
        data_nascimento: '1980-01-01',
        sexo: 'OUTRO',
        raca_cor: 'NAO_DECLARADO',
        escolaridade: 'SUPERIOR',
        endereco_logradouro: 'Avenida Central',
        endereco_numero: '1200',
        endereco_bairro: 'Centro',
        endereco_cidade: 'São Paulo',
        endereco_estado: 'SP',
        endereco_cep: '01001000',
        telefone,
        papel: Papeis.ADMINISTRADOR_PRINCIPAL,
        data_contratacao: new Date().toISOString().slice(0, 10),
        ativo: true,
    });

    if (insertError) {
        // Reverte o usuário do Auth para não deixar conta órfã.
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Erro ao criar perfil do administrador: ${insertError.message}`);
    }

    // Vincula o admin à unidade recém-criada (facilita o login já mostrar a unidade).
    if (unidadeId) {
        await supabase
            .from('funcionario_unidade')
            .insert({funcionario_id: authUser.user.id, unidade_saude_id: unidadeId});
    }

    console.log(`• Administrador criado: ${email} (senha encriptada em bcrypt pelo Supabase Auth)`);
}

async function main(): Promise<void> {
    console.log('\n🏥 Seed do Sistema Hospitalar\n');

    const unidadeId = await seedInfraestrutura();
    await seedAdministrador(unidadeId);

    console.log('\n✅ Seed concluído.\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Falha no seed:', error instanceof Error ? error.message : error);
        process.exit(1);
    });
