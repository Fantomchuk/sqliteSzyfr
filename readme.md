# Про проєкт
-   "name" => "Local DB"
-   "version" => "1.0.5"

# Ціль для чого був створений даний проєкт
Цілю данного проєкту являється створення зашифрованої локальної бази даних за допомогою фреймворка "Electrona". Під час виявлення помилки роботи програми, дана подія записується до локального файлу і відображається в консолі. Це необхідно для покращення праці програми та коду.


# Використані бібліотекі Node.js
## "sqlite3": "^4.2.0"
основна бібліотека для баз даних

## "@journeyapps/sqlcipher": "^5.2.0"
накладка для шифрування локальної бази даних

## "asar": "^3.0.3"
бібліотека для вигенерування проєкту "Electron" на різні системи.

## "keytar": "^7.7.0"
бібліотека для приховування ключа шифрування, якій буде зберігатися в пакеті ключів на локальній машині

## "rxjs": "^7.3.0"
бібліотека реактивних розширень для JavaScript, використовуємо для наслуховування змін в базі даних в проєкті

## "uuid": "^8.3.2"
бібліотека для вигенерування унікальних ключів

# Опис як працює
Для того щоб додати до бази даних нову табличку потрібно в папці ./backend/dbModels створити новий клас. Новий клас повинен називатися так само як табличка в базі даних. Новий клас можна створити на основі прикладу _example.js. Після створення цього класу, з нього одразу можна користатися. Вистачить його підключити як const newClass = require("./backend/dbModels/newClass"). Цей клас одразу унаслідує всі методи його батьківського елементу, тобто ModelDB.js якій уже має кілька дефолтових метод (шукання, усування і додавання). Більш детальніша інформація по даному класі і його методах знаходиться в документації.
# Запуск проєкту
Для запуску програми потрібно на локальній машині склонувати репозиторій Git-u, а потім виконати інсталяції і компіляції пакетів для подальшої роботи.
## 1. Створюємо папку для нашого проєкту
<span style='color: #ff5252;'>cd ~ Desktop</span><br>
<span style='color: #ff5252;'>mkdir electron</span>

## 2. Переходимо в папку і виконуємо клонування репозиторію Git-а
<span style='color: #ff5252;'>cd electron</span><br>
<span style='color: #ff5252;'>git clone https://github.com/Fantomchuk/sqliteSzyfr.git</span>

## 3. Переходимо в створену папку і виконуємо інсталяцію бібліотек
<span style='color: #ff5252;'>cd sqliteSzyfr</span><br>
<span style='color: #ff5252;'>npm install</span>


## 4. Запускаємо проєкт
<span style='color: #ff5252;'>npm run star</span>

## 5. Генеруємо проєкти під конкретну систему
### 5.1 WINDOWS
Для того щоб сворити додаток на системі WINDOWS, виконуємо кроки 2-4 на компютері з системою WINDOWS на якому заінстальований Node.js<br>
<span style='color: #ff5252;'>npm run win</span>

### 5.2 Mack OS
Для того щоб сворити додаток на системі Mack OS, виконуємо кроки 2-4 на компютері з системою Mack OS на якому заінстальований Node.js<br>
<span style='color: #ff5252;'>npm run mac</span>

# Документація
<a href="https://github.com/Fantomchuk/sqliteSzyfr/documentation/jsdoc/index.html" target="_blank">Документація</a>