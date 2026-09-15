import {describe, expect, it} from '@jest/globals';
import {
    ChamarPacienteDTO,
    CreateLeitoDTO,
    CreatePrescricaoDTO,
    CreateProntuarioDTO,
    CreateSalaDTO,
    ListLeitosQueryDTO,
    ListSalasQueryDTO,
    ListTriagensQueryDTO,
    UpdateLeitoStatusDTO,
} from '../src/modulo/core/dtos';
import {PrioridadeChamada, StatusLeito, StatusSala} from '../src/modulo/core/model/Enums';

const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OUTRO_UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3302';

describe('DTOs — Salas', () => {
    it('exige unidade, nome e tipo', () => {
        expect(() => CreateSalaDTO.parse({nome: 'Sala 1'})).toThrow();
        expect(() =>
            CreateSalaDTO.parse({unidadeSaudeId: UUID, nome: 'Consultório 01', tipo: 'Consultório médico'})
        ).not.toThrow();
    });

    it('aplica o status padrão LIVRE e valida status inválido', () => {
        const sala = CreateSalaDTO.parse({
            unidadeSaudeId: UUID,
            nome: 'Sala Vermelha',
            tipo: 'Emergência',
        });
        expect(sala.status).toBeUndefined(); // o service aplica o default do banco

        expect(() =>
            CreateSalaDTO.parse({
                unidadeSaudeId: UUID,
                nome: 'Sala X',
                tipo: 'Exames',
                status: 'OCUPADA',
            })
        ).toThrow();
    });

    it('aceita responsável nulo (limpar responsável) e filtra por status na query', () => {
        expect(() =>
            CreateSalaDTO.parse({unidadeSaudeId: UUID, nome: 'Sala 2', tipo: 'Triagem', responsavelId: null})
        ).not.toThrow();

        const query = ListSalasQueryDTO.parse({status: 'EM_ATENDIMENTO', unidadeSaudeId: UUID});
        expect(query.status).toBe(StatusSala.EM_ATENDIMENTO);
        expect(() => ListSalasQueryDTO.parse({status: 'INEXISTENTE'})).toThrow();
    });

    it('converte incluirInativas=false em booleano false (e não true)', () => {
        const query = ListSalasQueryDTO.parse({incluirInativas: 'false'});
        expect(query.incluirInativas).toBe(false);

        const query2 = ListSalasQueryDTO.parse({incluirInativas: 'true'});
        expect(query2.incluirInativas).toBe(true);
    });
});

describe('DTOs — Chamadas de pacientes', () => {
    it('aceita pacienteId OU triagemId, mas exige um dos dois', () => {
        expect(() => ChamarPacienteDTO.parse({sala: 'Consultório 01'})).toThrow();

        expect(() =>
            ChamarPacienteDTO.parse({pacienteId: UUID, sala: 'Consultório 01'})
        ).not.toThrow();

        expect(() =>
            ChamarPacienteDTO.parse({triagemId: OUTRO_UUID, salaId: UUID})
        ).not.toThrow();
    });

    it('exige a sala por id ou por nome', () => {
        expect(() => ChamarPacienteDTO.parse({pacienteId: UUID})).toThrow();
    });

    it('normaliza a prioridade para a grafia do painel', () => {
        const maiuscula = ChamarPacienteDTO.parse({pacienteId: UUID, sala: 'Sala 1', prioridade: 'VERMELHO'});
        expect(maiuscula.prioridade).toBe(PrioridadeChamada.Vermelho);

        const capitalizada = ChamarPacienteDTO.parse({pacienteId: UUID, sala: 'Sala 1', prioridade: 'Laranja'});
        expect(capitalizada.prioridade).toBe(PrioridadeChamada.Laranja);

        expect(() => ChamarPacienteDTO.parse({pacienteId: UUID, sala: 'Sala 1', prioridade: 'Roxo'})).toThrow();
    });
});

describe('DTOs — Leitos', () => {
    it('valida setor e status do leito', () => {
        expect(() =>
            CreateLeitoDTO.parse({
                unidadeSaudeId: UUID,
                nomeOuNumero: 'Leito 01',
                setor: 'SALA_VERMELHA',
                monitorCardiaco: true,
            })
        ).not.toThrow();

        expect(() =>
            CreateLeitoDTO.parse({unidadeSaudeId: UUID, nomeOuNumero: 'Leito 01', setor: 'CORREDOR'})
        ).toThrow();
    });

    it('exige pacienteId quando o status é OCUPADO', () => {
        expect(() => UpdateLeitoStatusDTO.parse({status: StatusLeito.OCUPADO})).toThrow();

        const ocupado = UpdateLeitoStatusDTO.parse({status: StatusLeito.OCUPADO, pacienteId: UUID});
        expect(ocupado.status).toBe(StatusLeito.OCUPADO);
    });

    it('aceita liberar e higienizar sem paciente', () => {
        expect(UpdateLeitoStatusDTO.parse({status: 'LIVRE'}).status).toBe(StatusLeito.LIVRE);
        expect(UpdateLeitoStatusDTO.parse({status: 'HIGIENIZACAO'}).status).toBe(StatusLeito.HIGIENIZACAO);
        expect(() => UpdateLeitoStatusDTO.parse({status: 'INEXISTENTE'})).toThrow();
    });

    it('filtra por setor na query (GET /api/leitos?setor=SALA_VERMELHA)', () => {
        expect(ListLeitosQueryDTO.parse({setor: 'SALA_VERMELHA'}).setor).toBe('SALA_VERMELHA');
    });
});

describe('DTOs — Paginação', () => {
    it('aceita pagina/limite e os aliases page/limit', () => {
        expect(ListTriagensQueryDTO.parse({pagina: '2', limite: '50'})).toMatchObject({pagina: 2, limite: 50});
        expect(ListTriagensQueryDTO.parse({page: '3', limit: '10'})).toMatchObject({page: 3, limit: 10});
    });

    it('trata parâmetro vazio como ausente e rejeita valores fora da faixa', () => {
        expect(ListTriagensQueryDTO.parse({pagina: ''}).pagina).toBeUndefined();
        expect(() => ListTriagensQueryDTO.parse({limite: '500'})).toThrow();
        expect(() => ListTriagensQueryDTO.parse({pagina: '0'})).toThrow();
        expect(() => ListTriagensQueryDTO.parse({pagina: 'abc'})).toThrow();
    });

    it('normaliza a classificação de risco do filtro para a grafia da triagem', () => {
        expect(ListTriagensQueryDTO.parse({classificacaoRisco: 'Vermelho'}).classificacaoRisco).toBe('VERMELHO');
        expect(ListTriagensQueryDTO.parse({classificacaoRisco: 'AZUL'}).classificacaoRisco).toBe('AZUL');
        expect(() => ListTriagensQueryDTO.parse({classificacaoRisco: 'rosa'})).toThrow();
    });
});

describe('DTOs — Prontuário (PEP SOAP)', () => {
    it('exige ao menos um campo de conteúdo', () => {
        expect(() => CreateProntuarioDTO.parse({pacienteId: UUID})).toThrow();

        expect(() =>
            CreateProntuarioDTO.parse({pacienteId: UUID, subjetivo: 'Paciente relata dor torácica há 2 horas'})
        ).not.toThrow();
    });

    it('aceita o contrato SOAP completo com CID-10 e assinatura', () => {
        const prontuario = CreateProntuarioDTO.parse({
            pacienteId: UUID,
            unidadeSaudeId: UUID,
            subjetivo: 'Dor torácica',
            objetivo: 'PA 150/90, FC 98',
            avaliacao: 'Suspeita de síndrome coronariana',
            plano: 'ECG, troponina, AAS',
            cid10: 'I20.0',
            assinadoDigitalmente: true,
        });

        expect(prontuario.avaliacao).toContain('coronariana');
        expect(prontuario.assinadoDigitalmente).toBe(true);
    });

    it('rejeita CID-10 inválido e mantém o texto livre legado', () => {
        expect(() => CreateProntuarioDTO.parse({pacienteId: UUID, cid10: '123', subjetivo: 'x'})).toThrow();

        expect(() =>
            CreateProntuarioDTO.parse({pacienteId: UUID, descricao: 'Evolução do paciente estável hoje'})
        ).not.toThrow();
    });
});

describe('DTOs — Prescrição estruturada', () => {
    it('exige medicamento + posologia (ou detalhesPrescricao)', () => {
        expect(() => CreatePrescricaoDTO.parse({pacienteId: UUID, medicamento: 'Dipirona'})).toThrow();

        const prescricao = CreatePrescricaoDTO.parse({
            pacienteId: UUID,
            medicamento: 'Dipirona 500mg',
            via: 'Oral',
            posologia: '1 comprimido a cada 6 horas',
            duracao: '3 dias',
        });
        expect(prescricao.medicamento).toBe('Dipirona 500mg');
    });

    it('mantém compatibilidade com o formato antigo (detalhesPrescricao)', () => {
        expect(() =>
            CreatePrescricaoDTO.parse({
                pacienteId: UUID,
                detalhesPrescricao: 'Dipirona 500mg de 6/6h por 3 dias',
                cid10: 'R50.9',
            })
        ).not.toThrow();
    });

    it('valida o status da prescrição', () => {
        expect(
            CreatePrescricaoDTO.parse({pacienteId: UUID, medicamento: 'Xarope', posologia: '5ml 8/8h', status: 'ATIVA'})
                .status
        ).toBe('ATIVA');
        expect(() =>
            CreatePrescricaoDTO.parse({pacienteId: UUID, medicamento: 'Xarope', posologia: '5ml 8/8h', status: 'PENDENTE'})
        ).toThrow();
    });
});
