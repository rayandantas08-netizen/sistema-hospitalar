import {Router} from 'express';
import {SalaController} from '../controller/SalaController';
import {requireAuth, restrictTo} from '../../../middleware/auth';
import {Papeis} from '../../core/model/Enums';

/**
 * Rotas de salas aninhadas na unidade de saúde.
 *
 * Montado em DOIS prefixos (ver src/modulo/index.ts):
 *   - /api/unidades/:unidadeSaudeId/salas       → contrato pedido pelo frontend
 *   - /api/unidades-saude/:unidadeSaudeId/salas → alias, mantém a nomenclatura
 *                                                 usada pelo resto da API
 */
const router = Router();
const salaController = new SalaController();

router.get(
    '/:unidadeSaudeId/salas',
    requireAuth,
    restrictTo(Papeis.ADMINISTRADOR_PRINCIPAL, Papeis.MEDICO, Papeis.ENFERMEIRO),
    salaController.listByUnidade.bind(salaController)
);

export {router};
