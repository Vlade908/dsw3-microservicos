FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p prisma/data

RUN npx prisma generate
RUN npx prisma db push

EXPOSE 3004

CMD ["node", "src/server.js"]
