const express = require("express");

const app = express();
const PORT = 3000;

// In Memory DB
const books = [
  { id: 1, title: "Book One", author: "Author One" },
  { id: 2, title: "Book Two", author: "Author Two" },
];

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

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
