# Minimal Alpine Linux container with TeXLive for ATS LaTeX PDF generation
FROM node:20-alpine AS runner

WORKDIR /app

# Install minimal Alpine TeXLive distribution
RUN apk add --no-cache \
    texlive-small \
    texmf-dist-latexextra \
    ghostscript

# Install dependencies and build application
COPY package*.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm install

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "run", "dev"]
