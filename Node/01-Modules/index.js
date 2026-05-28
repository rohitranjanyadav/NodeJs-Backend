const fs = require("node:fs");

const contents = fs.readFileSync("notes.txt", "utf-8");

console.log(contents);

fs.writeFileSync("copy.txt", contents, "utf-8");

fs.appendFileSync("copy.txt", "Appended to copy.txt", "utf-8");

fs.mkdirSync("games/a/b", { recursive: true });

fs.rmdirSync("games/a/b");

fs.unlinkSync("copy.txt");
