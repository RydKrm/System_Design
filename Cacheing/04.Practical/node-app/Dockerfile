# Stage 1: Build
FROM node:22-alpine AS builder
RUN npm install -g nodemon
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ./ ./
# RUN npx prisma generate

# Stage 2: RUN
FROM node:22-alpine
WORKDIR /app
RUN npm install -g nodemon
COPY --from=builder /app ./
EXPOSE 8002
CMD ["nodemon","src/index.js"]