FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# URL fictícia só para o "generate" não reclamar durante o build
ENV DATABASE_URL="postgresql://app:app@db:5432/monitor"
RUN npx prisma generate

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npx tsx src/server.ts"]