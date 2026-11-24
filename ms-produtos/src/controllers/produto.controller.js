import prisma from '../database/prisma.js';
import brokerClient from '../services/brokerClient.js';

/**
 * Cadastrar um novo produto
 * POST /produtos
 */
export async function cadastrarProduto(req, res) {
  try {
    const { nome, preco, descricao, imagemUrl, estoque } = req.body;

    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
      return res.status(400).json({ error: 'O campo "nome" é obrigatório.' });
    }

    if (preco === undefined || typeof preco !== 'number' || preco < 0) {
      return res.status(400).json({ error: 'O campo "preco" deve ser um número maior ou igual a zero.' });
    }

    if (estoque === undefined || typeof estoque !== 'number' || estoque < 0 || !Number.isInteger(estoque)) {
      return res.status(400).json({ error: 'O campo "estoque" deve ser um número inteiro maior ou igual a zero.' });
    }

    const imagemSanitizada =
      typeof imagemUrl === 'string' && imagemUrl.trim() !== '' ? imagemUrl.trim() : null;

    const novoProduto = await prisma.produto.create({
      data: {
        nome: nome.trim(),
        preco,
        descricao: descricao ? descricao.trim() : null,
        imagemUrl: imagemSanitizada,
        estoque
      },
      select: {
        id: true,
        nome: true,
        preco: true,
        descricao: true,
        imagemUrl: true,
        estoque: true
      }
    });

    // Publicar evento assíncrono para replicar cache no ms-pedidos
    brokerClient.publicarEvento('produtos', 'PRODUTO_CRIADO', novoProduto);

    return res.status(201).json(novoProduto);
  } catch (error) {
    console.error('[ms-produtos] Erro ao cadastrar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar produto.' });
  }
}

/**
 * Listar todos os produtos
 * GET /produtos
 */
export async function listarProdutos(req, res) {
  try {
    const produtos = await prisma.produto.findMany({
      select: {
        id: true,
        nome: true,
        preco: true,
        descricao: true,
        imagemUrl: true,
        estoque: true
      },
      orderBy: {
        nome: 'asc'
      }
    });

    return res.status(200).json(produtos);
  } catch (error) {
    console.error('[ms-produtos] Erro ao listar produtos:', error);
    return res.status(500).json({ error: 'Erro interno ao listar produtos.' });
  }
}

/**
 * Buscar detalhes de um produto por ID
 * GET /produtos/:id
 */
export async function buscarProdutoPorId(req, res) {
  try {
    const { id } = req.params;

    const produto = await prisma.produto.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        preco: true,
        descricao: true,
        imagemUrl: true,
        estoque: true
      }
    });

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    return res.status(200).json(produto);
  } catch (error) {
    console.error('[ms-produtos] Erro ao buscar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar produto.' });
  }
}

/**
 * Atualizar estoque de um produto (operação interna para baixa ou ajuste)
 * PATCH /produtos/:id/estoque
 */
export async function atualizarEstoqueProduto(req, res) {
  try {
    const { id } = req.params;
    const { quantidade, operacao = 'subtrair', idempotencyKey } = req.body;

    if (!quantidade || typeof quantidade !== 'number' || quantidade <= 0 || !Number.isInteger(quantidade)) {
      return res.status(400).json({ error: 'Quantidade inválida para atualização de estoque.' });
    }

    if (operacao !== 'subtrair' && operacao !== 'adicionar') {
      return res.status(400).json({ error: 'Operação de estoque inválida. Use "subtrair" ou "adicionar".' });
    }

    const selectProduto = {
      id: true,
      nome: true,
      preco: true,
      descricao: true,
      imagemUrl: true,
      estoque: true
    };

    const resultado = await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const jaProcessado = await tx.eventoProcessado.findUnique({
          where: { id: String(idempotencyKey) }
        });
        if (jaProcessado) {
          const produtoExistente = await tx.produto.findUnique({
            where: { id },
            select: selectProduto
          });
          if (!produtoExistente) {
            throw { status: 404, message: 'Produto não encontrado.' };
          }
          return { alreadyProcessed: true, produto: produtoExistente };
        }
      }

      const produto = await tx.produto.findUnique({ where: { id } });
      if (!produto) {
        throw { status: 404, message: 'Produto não encontrado.' };
      }

      let novoEstoque = produto.estoque;
      if (operacao === 'subtrair') {
        if (produto.estoque < quantidade) {
          throw {
            status: 400,
            message: `Quantidade solicitada excede o estoque disponível (Disponível: ${produto.estoque}).`
          };
        }
        novoEstoque -= quantidade;
      } else {
        novoEstoque += quantidade;
      }

      const produtoAtualizado = await tx.produto.update({
        where: { id },
        data: { estoque: novoEstoque },
        select: selectProduto
      });

      if (idempotencyKey) {
        await tx.eventoProcessado.create({
          data: {
            id: String(idempotencyKey),
            event: operacao === 'subtrair' ? 'PEDIDO_BAIXA' : 'PEDIDO_ESTORNO'
          }
        });
      }

      return { alreadyProcessed: false, produto: produtoAtualizado };
    });

    if (!resultado.alreadyProcessed) {
      // Notificar broker sobre a alteração de estoque com chave causal para deduplicação
      brokerClient.publicarEvento('produtos', 'ESTOQUE_ATUALIZADO', {
        ...resultado.produto,
        causaKey: idempotencyKey ? String(idempotencyKey) : null
      });
    } else {
      console.log(`[ms-produtos] Operação de estoque ignorada por idempotência (key=${idempotencyKey}).`);
    }

    return res.status(200).json(resultado.produto);
  } catch (error) {
    if (error && error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('[ms-produtos] Erro ao atualizar estoque:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar estoque.' });
  }
}

/**
 * Atualizar dados completos do produto
 * PUT /produtos/:id
 */
export async function atualizarProduto(req, res) {
  try {
    const { id } = req.params;
    const { nome, preco, descricao, imagemUrl, estoque } = req.body;

    const produtoExistente = await prisma.produto.findUnique({ where: { id } });
    if (!produtoExistente) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (nome !== undefined && (typeof nome !== 'string' || nome.trim() === '')) {
      return res.status(400).json({ error: 'O campo "nome" não pode ser vazio.' });
    }

    if (preco !== undefined && (typeof preco !== 'number' || preco < 0)) {
      return res.status(400).json({ error: 'O campo "preco" deve ser um número maior ou igual a zero.' });
    }

    if (estoque !== undefined && (typeof estoque !== 'number' || estoque < 0 || !Number.isInteger(estoque))) {
      return res.status(400).json({ error: 'O campo "estoque" deve ser um número inteiro maior ou igual a zero.' });
    }

    const imagemSanitizada =
      imagemUrl !== undefined
        ? typeof imagemUrl === 'string' && imagemUrl.trim() !== ''
          ? imagemUrl.trim()
          : null
        : produtoExistente.imagemUrl;

    const produtoAtualizado = await prisma.produto.update({
      where: { id },
      data: {
        nome: nome !== undefined ? nome.trim() : produtoExistente.nome,
        preco: preco !== undefined ? preco : produtoExistente.preco,
        descricao: descricao !== undefined ? (descricao ? descricao.trim() : null) : produtoExistente.descricao,
        imagemUrl: imagemSanitizada,
        estoque: estoque !== undefined ? estoque : produtoExistente.estoque
      },
      select: {
        id: true,
        nome: true,
        preco: true,
        descricao: true,
        imagemUrl: true,
        estoque: true
      }
    });

    // Notificar broker sobre a atualização cadastral
    brokerClient.publicarEvento('produtos', 'PRODUTO_ATUALIZADO', produtoAtualizado);

    return res.status(200).json(produtoAtualizado);
  } catch (error) {
    console.error('[ms-produtos] Erro ao atualizar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar produto.' });
  }
}

/**
 * Excluir um produto do catálogo
 * DELETE /produtos/:id
 */
export async function excluirProduto(req, res) {
  try {
    const { id } = req.params;

    const produtoExistente = await prisma.produto.findUnique({ where: { id } });
    if (!produtoExistente) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    await prisma.produto.delete({ where: { id } });

    // Notificar broker sobre exclusão do produto
    brokerClient.publicarEvento('produtos', 'PRODUTO_EXCLUIDO', { id });

    return res.status(200).json({ message: 'Produto excluído com sucesso.' });
  } catch (error) {
    console.error('[ms-produtos] Erro ao excluir produto:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir produto.' });
  }
}
