import {Router} from 'express';
import {router as authRoutes} from './auth/routes/authRoutes';
import {router as chamadaRoutes} from './chamada/routes/chamadaRoutes';
import {router as consultaRoutes} from './consulta/routes/consultaRoutes';
import {router as enfermeiroRoutes} from './enfermeiro/routes/enfermeiroRoutes';
import {router as leitoRoutes} from './leito/routes/leitoRoutes';
import {router as medicoRoutes} from './medico/routes/medicoRoutes';
import {router as pacienteRoutes} from './paciente/routes/pacienteRoutes';
import {router as prescricaoRoutes} from './prescricao/routes/prescricaoRoutes';
import {router as prontuarioRoutes} from './prontuario/routes/prontuarioRoutes';
import {router as salaRoutes} from './sala/routes/salaRoutes';
import {router as unidadeSalaRoutes} from './sala/routes/unidadeSalaRoutes';
import {router as salaVermelhaRoutes} from './triagem/routes/salaVermelhaRoutes';
import {router as triagemRoutes} from './triagem/routes/triagemRoutes';
import {router as unidadeSaudeRoutes} from './unidade-saude/routes/unidadeSaudeRoutes';
import {router as iaRoutes} from './ia/routes/iaRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/consultas', consultaRoutes);
router.use('/enfermeiros', enfermeiroRoutes);
router.use('/medicos', medicoRoutes);
router.use('/pacientes', pacienteRoutes);
router.use('/prescricoes', prescricaoRoutes);
router.use('/prontuarios', prontuarioRoutes);
router.use('/triagens', triagemRoutes);
router.use('/unidades-saude', unidadeSaudeRoutes);
// Alias legado usado pelo frontend: mantém /api/unidades para listagem e CRUD
// de unidades, sem remover a nomenclatura oficial /api/unidades-saude.
router.use('/unidades', unidadeSaudeRoutes);
router.use('/ia', iaRoutes);

// --- Salas -----------------------------------------------------------------
// GET/POST/PUT/DELETE /api/salas
router.use('/salas', salaRoutes);
// GET /api/unidades/:unidadeSaudeId/salas  (contrato do frontend)
router.use('/unidades', unidadeSalaRoutes);
// Alias com a nomenclatura usada pelo resto da API.
router.use('/unidades-saude', unidadeSalaRoutes);

// --- Chamadas de pacientes (painel de TV e consultório) --------------------
// POST /api/chamadas/chamar | GET /api/chamadas/ultimas | /fila | /eventos | /ws
router.use('/chamadas', chamadaRoutes);

// --- Leitos (Sala Vermelha, UTI, Enfermaria, Isolamento) -------------------
router.use('/leitos', leitoRoutes);

// --- Fila da Sala Vermelha -------------------------------------------------
// GET /api/sala-vermelha/fila | /api/sala-vermelha/leitos
router.use('/sala-vermelha', salaVermelhaRoutes);

export {router};
