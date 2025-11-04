FROM node:18-alpine
WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm ci

# copy rest
COPY . .

# generate prisma client (after dependencies installed)
RUN npx prisma generate

EXPOSE 4000

CMD sh -c "npx prisma migrate deploy && node scripts/apply-triggers.js && node src/server.js"
