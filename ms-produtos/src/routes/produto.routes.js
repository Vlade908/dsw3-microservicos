import { Router } from 'express';
import {
  cadastrarProduto,
  listarProdutos,
  buscarProdutoPorId,
  atualizarEstoqueProduto,
  atualizarProduto,
  excluirProduto
} from '../controllers/produto.controller.js';

const router = Router();

router.post('/', cadastrarProduto);
router.get('/', listarProdutos);
router.get('/:id', buscarProdutoPorId);
router.put('/:id', atualizarProduto);
router.delete('/:id', excluirProduto);
router.patch('/:id/estoque', atualizarEstoqueProduto);

export default router;
