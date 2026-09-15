import {Router} from 'express';
import {LeitoController} from '../controller/LeitoController';
import {requireAuth, restrictTo} from '../../../middleware/auth';
import {Papeis} from '../../core/model/Enums';

const router = Router();
const leitoController = new LeitoController();

const TODOS_OS_PAPEIS = [Papeis.ADMINISTRADOR_PRINCIPAL, Papeis.MEDICO, Papeis.ENFERMEIRO];
// Mudança de status do leito (internar/liberar/higienizar) é operação da equipe.
const EQUIPE_ASSISTENCIAL = [Papeis.MEDICO, Papeis.ENFERMEIRO, Papeis.ADMINISTRADOR_PRINCIPAL];

router.post('/', requireAuth, restrictTo(...EQUIPE_ASSISTENCIAL), leitoController.create.bind(leitoController));
router.get('/', requireAuth, restrictTo(...TODOS_OS_PAPEIS), leitoController.list.bind(leitoController));
// `/resumo` precisa vir antes de `/:id` para não ser capturado como id.
router.get('/resumo', requireAuth, restrictTo(...TODOS_OS_PAPEIS), leitoController.resumo.bind(leitoController));
router.get('/:id', requireAuth, restrictTo(...TODOS_OS_PAPEIS), leitoController.get.bind(leitoController));
router.put('/:id', requireAuth, restrictTo(...EQUIPE_ASSISTENCIAL), leitoController.update.bind(leitoController));
router.patch(
    '/:id/status',
    requireAuth,
    restrictTo(...EQUIPE_ASSISTENCIAL),
    leitoController.updateStatus.bind(leitoController)
);

export {router};
