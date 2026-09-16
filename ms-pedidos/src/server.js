import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pedidoRoutes from './routes/pedido.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'ms-pedidos',
    timestamp: new Date().toISOString()
  });
});

// Rotas de pedidos
app.use('/pedidos', pedidoRoutes);

app.listen(PORT, () => {
  console.log(`[ms-pedidos] Servidor rodando na porta ${PORT}`);
});
