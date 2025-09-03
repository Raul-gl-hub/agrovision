FROM node:20-alpine

WORKDIR /app

# Copiamos SOLO package.json (no hay package-lock)
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copiamos el resto del código
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
