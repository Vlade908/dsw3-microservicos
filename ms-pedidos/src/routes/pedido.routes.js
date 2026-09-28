import { Router } from 'express';
import {
  criarPedido,
  listarPedidos,
  buscarPedidoPorId,
  cancelarPedido
} from '../controllers/pedido.controller.js';

const router = Router();

router.post('/', criarPedido);
router.get('/', listarPedidos);
router.get('/:id', buscarPedidoPorId);
router.patch('/:id/cancelar', cancelarPedido);

export default router;
