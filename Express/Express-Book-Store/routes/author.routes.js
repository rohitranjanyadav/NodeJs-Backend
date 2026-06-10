const express = require("express");
const authorController = require("../controllers/author.controller");

const router = express.Router();

router.get("/", authorController.getAllAuthors);

router.get("/:id", authorController.getAuthorById);

router.post("/", authorController.createAuthor);

router.get("/:id/books", authorController.getBooksByAuthorId);

module.exports = router;
