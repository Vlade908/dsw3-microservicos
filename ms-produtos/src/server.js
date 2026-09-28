import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import produtoRoutes from './routes/produto.routes.js';
import eventoRoutes from './routes/evento.routes.js';
import brokerClient from './services/brokerClient.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'ms-produtos',
    timestamp: new Date().toISOString()
  });
});

// Rotas principais
app.use('/produtos', produtoRoutes);
app.use('/eventos', eventoRoutes);

app.listen(PORT, () => {
  console.log(`[ms-produtos] Servidor rodando na porta ${PORT}`);
  // Iniciar conexão com o Barramento de Eventos (Event Broker)
  brokerClient.iniciar();
});

