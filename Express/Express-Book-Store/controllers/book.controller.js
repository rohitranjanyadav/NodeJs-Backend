const { BOOKS } = require("../models/books");

exports.getAllBooks = function (req, res) {
  res.json(BOOKS);
};

exports.getBookById = function (req, res) {
  const id = parseInt(req.params.id);

  // Bad Request
  if (isNaN(id))
    return res.status(400).json({ error: `id must be of type number` });

  const book = BOOKS.find((b) => b.id === id);

  if (!book)
    return res.status(404).json({ error: `Book with id ${id} does not exist` });

  return res.json(book);
};

exports.createBook = function (req, res) {
  const { title, author } = req.body;

  if (!title || title === "")
    return res.status(400).json({ error: "title is requires" });
  if (!author || author === "")
    return res.status(400).json({ error: "author is requires" });

  const id = BOOKS.length + 1;

  const book = { id, title, author };

  BOOKS.push(book);

  return res.status(201).json({ message: "Book created successfully", book });
};

exports.deleteBookById = function (req, res) {
  const id = parseInt(req.params.id);

  if (isNaN(id))
    return res.status(400).json({ error: `id must be of type number` });

  const indexToDelete = BOOKS.findIndex((e) => e.id === id);

  if (indexToDelete < 0)
    return res.status(404).json({ error: `book with id ${id} does not exist` });

  const deletedBook = BOOKS.splice(indexToDelete, 1);

  return res.status(200).json({ message: "Book deleted", deletedBook });
};
