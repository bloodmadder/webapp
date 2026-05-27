const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;
const db = new sqlite3.Database('./library.db');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));


db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER,
    genre TEXT,
    description TEXT,
    available INTEGER DEFAULT 1,
    cover_url TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS readers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketNumber TEXT UNIQUE NOT NULL,
    fullName TEXT NOT NULL,
    age INTEGER,
    phone TEXT,
    email TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS borrowed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    readerId INTEGER NOT NULL,
    bookId INTEGER NOT NULL,
    borrowDate TEXT NOT NULL,
    returnDate TEXT,
    status TEXT DEFAULT 'borrowed',
    FOREIGN KEY (readerId) REFERENCES readers(id),
    FOREIGN KEY (bookId) REFERENCES books(id)
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    text TEXT,
    date TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date DATETIME NOT NULL,
    text TEXT,
    image TEXT
  )`);

  
  db.all("PRAGMA table_info(books)", (err, rows) => {
    if (err) return;
    const hasCover = rows.some(r => r.name === 'cover_url');
    if (!hasCover) {
      db.run("ALTER TABLE books ADD COLUMN cover_url TEXT", () => {
        console.log('Добавлена колонка cover_url в таблицу books');
      });
    }
  });

  // демо при первом запуске
  db.get("SELECT COUNT(*) AS cnt FROM books", (err, row) => {
    if (row && row.cnt === 0) {
      const insertBooks = [
        ['Война и мир', 'Лев Толстой', 1869, 'Роман-эпопея', 'Шедевр мировой литературы, описывающий русское общество в эпоху наполеоновских войн.', 1, 'https://cv9.litres.ru/pub/c/cover_415/12345678.jpg'],
        ['Преступление и наказание', 'Фёдор Достоевский', 1866, 'Роман', 'История студента Раскольникова, совершившего убийство и его душевных терзаний.', 1, 'https://cv9.litres.ru/pub/c/cover_415/23456789.jpg'],
        ['Мастер и Маргарита', 'Михаил Булгаков', 1967, 'Роман', 'Сатирический роман о визите дьявола в Москву 1930-х годов.', 1, 'https://cv9.litres.ru/pub/c/cover_415/34567890.jpg'],
        ['Тихий Дон', 'Михаил Шолохов', 1940, 'Роман-эпопея', 'Судьба донского казачества в годы Первой мировой и Гражданской войны.', 1, 'https://cv9.litres.ru/pub/c/cover_415/45678901.jpg'],
        ['Евгений Онегин', 'Александр Пушкин', 1833, 'Роман в стихах', 'Классический роман о любви, чести и разочаровании.', 1, 'https://cv9.litres.ru/pub/c/cover_415/56789012.jpg'],
        ['Герой нашего времени', 'Михаил Лермонтов', 1840, 'Роман', 'Психологический портрет молодого офицера Печорина.', 1, 'https://cv9.litres.ru/pub/c/cover_415/67890123.jpg'],
      ];
      const stmt = db.prepare("INSERT INTO books (title, author, year, genre, description, available, cover_url) VALUES (?,?,?,?,?,?,?)");
      insertBooks.forEach(b => stmt.run(b));
      stmt.finalize();

      const insertReaders = [
        ['Б-2024-0001', 'Иванов Иван Иванович', 25, '+7 (999) 123-45-67', 'ivanov@mail.ru'],
        ['Б-2024-0002', 'Петрова Анна Сергеевна', 32, '+7 (999) 234-56-78', 'petrova@mail.ru'],
        ['Б-2024-0003', 'Сидоров Михаил Петрович', 19, '+7 (999) 345-67-89', 'sidorov@mail.ru']
      ];
      const stmtR = db.prepare("INSERT INTO readers (ticketNumber, fullName, age, phone, email) VALUES (?,?,?,?,?)");
      insertReaders.forEach(r => stmtR.run(r));
      stmtR.finalize();

      const insertBorrowed = [
        [1, 1, '2024-01-15', '2024-02-15', 'returned'],
        [1, 3, '2024-03-01', '2024-03-20', 'returned'],
        [1, 5, '2024-05-10', '2024-06-10', 'returned'],
        [2, 2, '2024-06-01', '2024-06-18', 'returned'],
        [2, 4, '2024-07-05', '2024-08-05', 'returned'], 
        [3, 6, '2024-08-12', '2024-09-12', 'returned']  
      ];
      const stmtB = db.prepare("INSERT INTO borrowed (readerId, bookId, borrowDate, returnDate, status) VALUES (?,?,?,?,?)");
      insertBorrowed.forEach(b => stmtB.run(b));
      stmtB.finalize();

      const insertNews = [
        ['Открытие нового читального зала', '2025-12-20', 'С радостью сообщаем об открытии нового читального зала на 50 мест с современным освещением и доступом к Wi-Fi.', 'images/news/1.jpg'],
        ['Поступление новых книг', '2025-11-15', 'Фонд библиотеки пополнился на 300 новых изданий, включая современную прозу и научно-популярную литературу.', 'images/news/2.jpg'],
        ['Встреча с писателем', '2025-10-05', 'Приглашаем на творческую встречу с известным автором детективных романов. Вход свободный.', 'images/news/3.jpg']
      ];
      const stmtN = db.prepare("INSERT INTO news (title, date, text, image) VALUES (?,?,?,?)");
      insertNews.forEach(n => stmtN.run(n));
      stmtN.finalize();
    }
  });
});

// ----------- АПИ -------
app.get('/api/books', (req, res) => {
  db.all("SELECT * FROM books", (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.get('/api/books/:id', (req, res) => {
  db.get("SELECT * FROM books WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({error: err.message});
    if (!row) return res.status(404).json({error: 'Книга не найдена'});
    res.json(row);
  });
});

app.get('/api/readers', (req, res) => {
  db.all("SELECT * FROM readers", (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.get('/api/readers/:id', (req, res) => {
  db.get("SELECT * FROM readers WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({error: err.message});
    if (!row) return res.status(404).json({error: 'Читатель не найден'});
    res.json(row);
  });
});

app.get('/api/readers/ticket/:number', (req, res) => { //рек - запрос, 
  db.get("SELECT * FROM readers WHERE ticketNumber = ?", [req.params.number], (err, row) => {
    if (err) return res.status(500).json({error: err.message});
    if (!row) return res.status(404).json({error: 'Билет не найден'});
    res.json(row);
  });
});

app.get('/api/borrowed', (req, res) => {
  db.all(`SELECT borrowed.*, books.title AS bookTitle, books.author AS bookAuthor
          FROM borrowed JOIN books ON borrowed.bookId = books.id
          ORDER BY borrowDate DESC`, (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.get('/api/borrowed/reader/:readerId', (req, res) => {
  db.all(`SELECT borrowed.*, books.title AS bookTitle, books.author AS bookAuthor
          FROM borrowed JOIN books ON borrowed.bookId = books.id
          WHERE readerId = ? ORDER BY borrowDate DESC`, [req.params.readerId], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.get('/api/news', (req, res) => {
  db.all("SELECT * FROM news ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.get('/api/news/:id', (req, res) => {
  db.get("SELECT * FROM news WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({error: err.message});
    if (!row) return res.status(404).json({error: 'Новость не найдена'});
    res.json(row);
  });
});

app.get('/api/wishes', (req, res) => {
  db.all("SELECT * FROM wishes ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.post('/api/wishes', (req, res) => {
  const { name, contact, text } = req.body;
  const date = new Date().toISOString().split('T')[0];
  db.run("INSERT INTO wishes (name, contact, text, date) VALUES (?,?,?,?)", [name, contact, text, date], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});


app.post('/api/admin/login', (req, res) => {
  const { login, password } = req.body;
  if (login === 'admin' && password === 'admin123') {
    res.json({ token: 'admin123' });
  } else {
    res.status(401).json({ error: 'Неверные данные' });
  }
});

function checkAdmin(req, res, next) {
  if (req.headers['x-admin'] === 'admin123') return next();
  res.status(403).json({ error: 'Доступ запрещён' });
}

app.post('/api/books', checkAdmin, (req, res) => {
  const { title, author, year, genre, description, available, cover_url } = req.body;
  db.run(`INSERT INTO books (title, author, year, genre, description, available, cover_url) VALUES (?,?,?,?,?,?,?)`,
    [title, author, year, genre, description, available ? 1 : 0, cover_url || null], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});

app.put('/api/books/:id', checkAdmin, (req, res) => {
  const { title, author, year, genre, description, available, cover_url } = req.body;
  db.run(`UPDATE books SET title=?, author=?, year=?, genre=?, description=?, available=?, cover_url=? WHERE id=?`,
    [title, author, year, genre, description, available ? 1 : 0, cover_url || null, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changes: this.changes });
  });
});

app.delete('/api/books/:id', checkAdmin, (req, res) => {
  db.run("DELETE FROM books WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changes: this.changes });
  });
});


app.post('/api/news', checkAdmin, (req, res) => {
  const { title, date, text, image } = req.body;
  db.run("INSERT INTO news (title, date, text, image) VALUES (?,?,?,?)", [title, date, text, image || null], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});

app.put('/api/news/:id', checkAdmin, (req, res) => {
  const { title, date, text, image } = req.body;
  db.run("UPDATE news SET title=?, date=?, text=?, image=? WHERE id=?", [title, date, text, image || null, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changes: this.changes });
  });
});

app.delete('/api/news/:id', checkAdmin, (req, res) => {
  db.run("DELETE FROM news WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changes: this.changes });
  });
});


app.post('/api/readers', checkAdmin, (req, res) => {
  const { ticketNumber, fullName, age, phone, email } = req.body;
  db.run(`INSERT INTO readers (ticketNumber, fullName, age, phone, email) VALUES (?,?,?,?,?)`,
    [ticketNumber, fullName, age, phone, email], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});

app.put('/api/readers/:id', checkAdmin, (req, res) => {
  const { ticketNumber, fullName, age, phone, email } = req.body;
  db.run(`UPDATE readers SET ticketNumber=?, fullName=?, age=?, phone=?, email=? WHERE id=?`,
    [ticketNumber, fullName, age, phone, email, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changes: this.changes });
  });
});

app.delete('/api/readers/:id', checkAdmin, (req, res) => {
  db.run("DELETE FROM readers WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changes: this.changes });
  });
});

app.post('/api/borrowed', checkAdmin, (req, res) => {
  const { readerId, bookId, borrowDate, status } = req.body;
  db.get("SELECT available FROM books WHERE id = ?", [bookId], (err, book) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!book) return res.status(404).json({ error: 'Книга не найдена' });
    if (book.available !== 1) return res.status(400).json({ error: 'Книга уже выдана' });
    db.run(
      "INSERT INTO borrowed (readerId, bookId, borrowDate, status) VALUES (?,?,?,?)",
      [readerId, bookId, borrowDate, status || 'borrowed'],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run("UPDATE books SET available = 0 WHERE id = ?", [bookId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID });
        });
      }
    );
  });
});

app.put('/api/borrowed/:id/return', checkAdmin, (req, res) => {
  const returnDate = new Date().toISOString().split('T')[0];
  db.get("SELECT bookId FROM borrowed WHERE id = ?", [req.params.id], (err, borrow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!borrow) return res.status(404).json({ error: 'Запись не найдена' });
    db.run(
      "UPDATE borrowed SET returnDate = ?, status = 'returned' WHERE id = ?",
      [returnDate, req.params.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run("UPDATE books SET available = 1 WHERE id = ?", [borrow.bookId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ changes: this.changes });
        });
      }
    );
  });
});

app.delete('/api/borrowed/:id', checkAdmin, (req, res) => {
  db.run("DELETE FROM borrowed WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changes: this.changes });
  });
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.delete('/api/wishes/:id', checkAdmin, (req, res) => {
  db.run("DELETE FROM wishes WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changes: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

