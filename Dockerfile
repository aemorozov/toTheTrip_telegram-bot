# Используем лёгкий Node.js образ
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем весь код в контейнер
COPY . .

# Команда запуска бота
CMD ["node", "bot.js"]
