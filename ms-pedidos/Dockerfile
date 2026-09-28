FROM node:20-alpine

WORKDIR /app

# Instalação do OpenSSL necessária para execução do Prisma Engine no Alpine
RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm install

COPY prisma ./prisma/

# Gera o Prisma Client durante o build da imagem
RUN npx prisma generate

COPY src ./src/

EXPOSE 3002

# Cria/atualiza tabelas no banco de dados SQLite montado em /app/prisma/data e inicia o servidor
CMD ["sh", "-c", "npx prisma db push && node src/server.js"]
