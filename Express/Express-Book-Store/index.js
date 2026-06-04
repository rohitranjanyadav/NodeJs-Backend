const express = require("express");

const app = express();
const PORT = 3000;

// In Memory DB
const books = [
  { id: 1, title: "Book One", author: "Author One" },
  { id: 2, title: "Book Two", author: "Author Two" },
];

// Middleware
app.use(express.json());

// Routes
app.get("/books", (req, res) => {
  res.json(books);
});

app.get("/books/:id", (req, res) => {
  const id = parseInt(req.params.id);

  // Bad Request
  if (isNaN(id))
    return res.status(400).json({ error: `id must be of type number` });

  const book = books.find((b) => b.id === id);

  if (!book)
    return res.status(404).json({ error: `Book with id ${id} does not exist` });

  return res.json(book);
});

app.post("/books", (req, res) => {
  const { title, author } = req.body;

  if (!title || title === "")
    return res.status(400).json({ error: "title is requires" });
  if (!author || author === "")
    return res.status(400).json({ error: "author is requires" });

  const id = books.length + 1;

  const book = { id, title, author };

  books.push(book);

  return res.status(201).json({ message: "Book created successfully", book });
});

app.delete("/books/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id))
    return res.status(400).json({ error: `id must be of type number` });

  const indexToDelete = books.findIndex((e) => e.id === id);

  if (indexToDelete < 0)
    return res.status(404).json({ error: `book with id ${id} does not exist` });

  const deletedBook = books.splice(indexToDelete, 1);

  return res.status(200).json({ message: "Book deleted", deletedBook });
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
