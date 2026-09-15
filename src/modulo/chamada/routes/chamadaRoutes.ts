import {Router} from 'express';
import {ChamadaController} from '../controller/ChamadaController';
import {requireAuth, requireAuthOuTokenPainel, restrictTo} from '../../../middleware/auth';
import {Papeis} from '../../core/model/Enums';

const router = Router();
const chamadaController = new ChamadaController();

const EQUIPE = [Papeis.MEDICO, Papeis.ENFERMEIRO, Papeis.ADMINISTRADOR_PRINCIPAL];

// --- Registro da chamada (consultório) -------------------------------------
router.post('/chamar', requireAuth, restrictTo(...EQUIPE), chamadaController.chamar.bind(chamadaController));

// --- Painel de TV: leitura liberada para o token do painel ------------------
// `requireAuthOuTokenPainel` aceita JWT OU PAINEL_TV_TOKEN; se a variável de
// ambiente não existir, somente JWT é aceito (comportamento seguro por padrão).
router.get(
    '/ultimas',
    requireAuthOuTokenPainel,
    chamadaController.ultimas.bind(chamadaController)
);
router.get(
    '/eventos',
    requireAuthOuTokenPainel,
    chamadaController.eventos.bind(chamadaController)
);
router.get(
    '/realtime',
    requireAuthOuTokenPainel,
    chamadaController.realtime.bind(chamadaController)
);

// --- Fila e histórico ------------------------------------------------------
router.get('/fila', requireAuth, restrictTo(...EQUIPE), chamadaController.fila.bind(chamadaController));
router.get('/', requireAuth, restrictTo(...EQUIPE), chamadaController.list.bind(chamadaController));

// --- Transições de estado --------------------------------------------------
router.patch(
    '/:id/finalizar',
    requireAuth,
    restrictTo(...EQUIPE),
    chamadaController.finalizar.bind(chamadaController)
);
router.patch(
    '/:id/iniciar',
    requireAuth,
    restrictTo(...EQUIPE),
    chamadaController.iniciar.bind(chamadaController)
);
router.get('/:id', requireAuth, restrictTo(...EQUIPE), chamadaController.get.bind(chamadaController));

export {router};
