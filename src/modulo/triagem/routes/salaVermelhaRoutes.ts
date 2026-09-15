import {Router} from 'express';
import {TriagemController} from '../controller/TriagemController';
import {LeitoController} from '../../leito/controller/LeitoController';
import {requireAuth, restrictTo} from '../../../middleware/auth';
import {Papeis} from '../../core/model/Enums';

/**
 * Rotas específicas da Sala Vermelha (emergência).
 * Montado em /api/sala-vermelha.
 */
const router = Router();
const triagemController = new TriagemController();
const leitoController = new LeitoController();

const EQUIPE = [Papeis.MEDICO, Papeis.ENFERMEIRO, Papeis.ADMINISTRADOR_PRINCIPAL];

// Fila de triagens classificadas como VERMELHO aguardando chamada.
router.get('/fila', requireAuth, restrictTo(...EQUIPE), triagemController.listFilaSalaVermelha.bind(triagemController));

// Leitos do setor SALA_VERMELHA (mesmo contrato do GET /api/leitos).
router.get('/leitos', requireAuth, restrictTo(...EQUIPE), leitoController.listSalaVermelha.bind(leitoController));

export {router};
