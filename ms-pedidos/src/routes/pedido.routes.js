import { Router } from 'express';
import {
  criarPedido,
  listarPedidos,
  buscarPedidoPorId
} from '../controllers/pedido.controller.js';

const router = Router();

router.post('/', criarPedido);
router.get('/', listarPedidos);
router.get('/:id', buscarPedidoPorId);

export default router;
