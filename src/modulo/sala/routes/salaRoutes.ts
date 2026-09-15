import {Router} from 'express';
import {SalaController} from '../controller/SalaController';
import {requireAuth, restrictTo} from '../../../middleware/auth';
import {Papeis} from '../../core/model/Enums';

const router = Router();
const salaController = new SalaController();

const TODOS_OS_PAPEIS = [Papeis.ADMINISTRADOR_PRINCIPAL, Papeis.MEDICO, Papeis.ENFERMEIRO];

router.post('/', requireAuth, restrictTo(Papeis.ADMINISTRADOR_PRINCIPAL), salaController.create.bind(salaController));
router.get('/', requireAuth, restrictTo(...TODOS_OS_PAPEIS), salaController.list.bind(salaController));
router.get('/:id', requireAuth, restrictTo(...TODOS_OS_PAPEIS), salaController.get.bind(salaController));
router.put(
    '/:id',
    requireAuth,
    restrictTo(Papeis.ADMINISTRADOR_PRINCIPAL, Papeis.ENFERMEIRO),
    salaController.update.bind(salaController)
);
router.delete(
    '/:id',
    requireAuth,
    restrictTo(Papeis.ADMINISTRADOR_PRINCIPAL),
    salaController.delete.bind(salaController)
);

export {router};
