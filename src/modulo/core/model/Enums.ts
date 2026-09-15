enum NivelGravidade {
    Vermelho = "VERMELHO", // Emergência, imediato
    Laranja = "LARANJA",   // Muito urgente, até 10 min
    Amarelo = "AMARELO",   // Urgente, até 60 min
    Verde = "VERDE",       // Pouco urgente, até 120 min
    Azul = "AZUL",         // Não urgente, até 240 min
}

enum TipoUnidadeSaude {
    Hospital = "HOSPITAL",
    UPA = "UPA",
    UBS = "UBS",
}

enum Papeis {
    ADMINISTRADOR_PRINCIPAL = "ADMINISTRADOR_PRINCIPAL",
    ENFERMEIRO = "ENFERMEIRO",
    MEDICO = "MEDICO",
}

/**
 * Situação operacional de uma sala.
 * LIVRE          → disponível para atendimento
 * EM_ATENDIMENTO → há atendimento em curso
 * MONITORADA     → sala com paciente sob monitoramento contínuo
 * INATIVA        → sala fora de operação (reforma, falta de equipe etc.)
 */
enum StatusSala {
    LIVRE = "LIVRE",
    EM_ATENDIMENTO = "EM_ATENDIMENTO",
    MONITORADA = "MONITORADA",
    INATIVA = "INATIVA",
}

enum SetorLeito {
    SALA_VERMELHA = "SALA_VERMELHA",
    UTI_GERAL = "UTI_GERAL",
    ENFERMARIA = "ENFERMARIA",
    ISOLAMENTO = "ISOLAMENTO",
}

enum StatusLeito {
    LIVRE = "LIVRE",
    OCUPADO = "OCUPADO",
    HIGIENIZACAO = "HIGIENIZACAO",
    MANUTENCAO = "MANUTENCAO",
    ISOLAMENTO = "ISOLAMENTO",
}

enum StatusChamada {
    CHAMANDO = "CHAMANDO",
    EM_ATENDIMENTO = "EM_ATENDIMENTO",
    FINALIZADO = "FINALIZADO",
    CANCELADO = "CANCELADO",
}

/**
 * Prioridade exibida no painel de TV. Atenção: a triagem usa NivelGravidade com
 * valores em CAIXA ALTA ('VERMELHO') e o painel usa a forma capitalizada
 * ('Vermelho'). Use `PrioridadeChamadaService.normalizar()` para converter —
 * o DTO aceita as duas grafias.
 */
enum PrioridadeChamada {
    Vermelho = "Vermelho",
    Laranja = "Laranja",
    Amarelo = "Amarelo",
    Verde = "Verde",
    Azul = "Azul",
}

enum StatusPrescricao {
    ATIVA = "ATIVA",
    SUSPENSA = "SUSPENSA",
    CANCELADA = "CANCELADA",
    CONCLUIDA = "CONCLUIDA",
}

/** Escala de resposta neurológica usada no MEWS (A=melhor, U=pior). */
enum EscalaAvpu {
    ALERTA = "ALERTA",
    VOZ = "VOZ",
    DOR = "DOR",
    IRRESPONSIVO = "IRRESPONSIVO",
}

enum Sexo {
    MASCULINO = "MASCULINO",
    FEMININO = "FEMININO",
    OUTRO = "OUTRO",
}

enum RacaCor {
    BRANCA = "BRANCA",
    PRETA = "PRETA",
    PARDA = "PARDA",
    AMARELA = "AMARELA",
    INDIGENA = "INDIGENA",
    NAO_DECLARADO = "NAO_DECLARADO",
}

enum Escolaridade {
    SEM_ESCOLARIDADE = "SEM_ESCOLARIDADE",
    FUNDAMENTAL = "FUNDAMENTAL",
    MEDIO = "MEDIO",
    SUPERIOR = "SUPERIOR",
    POS_GRADUACAO = "POS_GRADUACAO",
}

export {
    NivelGravidade,
    TipoUnidadeSaude,
    Papeis,
    Sexo,
    RacaCor,
    Escolaridade,
    StatusSala,
    SetorLeito,
    StatusLeito,
    StatusChamada,
    PrioridadeChamada,
    StatusPrescricao,
    EscalaAvpu
}
