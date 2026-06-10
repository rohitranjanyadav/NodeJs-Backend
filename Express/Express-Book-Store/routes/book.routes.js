const express = require("express");
const bookController = require("../controllers/book.controller");

const router = express.Router();

router.get("/", bookController.getAllBooks);

router.get("/:id", bookController.getBookById);

router.post("/", bookController.createBook);

router.delete("/:id", bookController.deleteBookById);

module.exports = router;
