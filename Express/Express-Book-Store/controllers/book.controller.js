const booksTable = require("../models/book.model");
const db = require("../db");
const { eq, ilike, sql } = require("drizzle-orm");
const authorsTable = require("../models/author.model");

exports.getAllBooks = async function (req, res) {
  const search = req.query.search;

  if (search) {
    const books = await db
      .select()
      .from(booksTable)
      .where(
        sql`to_tsvector('english',${booksTable.title}) @@ to_tsquery('english',${search})`,
      );

    return res.json(books);
  }

  const books = await db.select().from(booksTable);
  return res.json(books);
};

exports.getBookById = async function (req, res) {
  const id = req.params.id;

  const [book] = await db
    .select()
    .from(booksTable)
    .where((table) => eq(table.id, id))
    .leftJoin(authorsTable, eq(booksTable.authorId, authorsTable.id))
    .limit(1);

  if (!book)
    return res.status(404).json({ error: `Book with id ${id} does not exist` });

  return res.json(book);
};

exports.createBook = async function (req, res) {
  const { title, description, authorId } = req.body;

  if (!title || title === "")
    return res.status(400).json({ error: "title is requires" });

  const [result] = await db
    .insert(booksTable)
    .values({
      title,
      authorId,
      description,
    })
    .returning({ id: booksTable.id });

  return res
    .status(201)
    .json({ message: "Book created successfully", id: result.id });
};

exports.deleteBookById = async function (req, res) {
  const id = req.params.id;

  await db.delete(booksTable).where(eq(booksTable.id, id));

  return res.status(200).json({ message: "Book deleted" });
};
