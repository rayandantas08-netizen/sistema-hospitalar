import {Router} from 'express';
import {TriagemController} from '../controller/TriagemController';
import {requireAuth, restrictTo} from '../../../middleware/auth';
import {Papeis} from '../../core/model/Enums';

const router = Router();
const triagemController = new TriagemController();

router.post('/', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.create.bind(triagemController));
router.get('/', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.MEDICO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.list.bind(triagemController));
router.put('/:id', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.update.bind(triagemController));
router.delete('/:id', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.delete.bind(triagemController));
// Rotas estáticas precisam vir ANTES de '/:id', senão o Express captura
// 'fila'/'mews' como se fossem um id de triagem.
router.get('/fila', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.MEDICO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.listFilaSalaVermelha.bind(triagemController));
router.get('/:id/mews', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.MEDICO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.getMews.bind(triagemController));
router.get('/:id', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.MEDICO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.get.bind(triagemController));
router.get('/pacientes/:pacienteId', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.MEDICO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.listByPaciente.bind(triagemController));
router.get('/gravidade/:nivelGravidade/unidade/:unidadeSaudeId', requireAuth, restrictTo(Papeis.ENFERMEIRO, Papeis.MEDICO, Papeis.ADMINISTRADOR_PRINCIPAL), triagemController.listByGravidade.bind(triagemController));

export {router};