const { Buffer } = require("buffer");

const buf = Buffer.from("Hello Rohit");
console.log(buf);
console.log(buf.toString());

const buf2 = Buffer.from("Rohit Ranjan Yadav")
console.log(buf2.toString('utf-8',0,5))

console.log("Changing the Buffer:")
const buf3 = Buffer.from("Rohit")
console.log(buf3)
buf3[0] = 0x4A
console.log(buf3)
console.log(buf3.toString())

// Merge buffer
const buff4=Buffer.from("Rohit ")
const buff5=Buffer.from("Ranjan")
const merged = Buffer.concat([buff4,buff5])
console.log(merged.toString())
console.log(merged.length)