FROM node:18-alpine

# Installer les dépendances système nécessaires pour pdf2pic et tesseract
RUN apk add --no-cache \
    imagemagick \
    ghostscript \
    tesseract-ocr \
    tesseract-ocr-data-fra \
    tesseract-ocr-data-eng

# Configurer ImageMagick pour autoriser la lecture des PDFs
RUN sed -i 's/rights="none" pattern="PDF"/rights="read | write" pattern="PDF"/' /etc/ImageMagick-7/policy.xml

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads

EXPOSE 5001

CMD ["node", "index.js"]