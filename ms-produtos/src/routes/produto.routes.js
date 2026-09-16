import { Router } from 'express';
import {
  cadastrarProduto,
  listarProdutos,
  buscarProdutoPorId,
  atualizarEstoqueProduto
} from '../controllers/produto.controller.js';

const router = Router();

router.post('/', cadastrarProduto);
router.get('/', listarProdutos);
router.get('/:id', buscarProdutoPorId);
router.patch('/:id/estoque', atualizarEstoqueProduto);

export default router;
