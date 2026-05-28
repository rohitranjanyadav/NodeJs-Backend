let num1 = 5;
let num2 = 8;
console.log("before if");

if (num1 > num2) {
  console.log("num1 is greater than num2");
} else {
  console.log("num2 is greater");
}

console.log("after if");

let username = "rohit";
let anotherUsername = "rohit1";

if (username == anotherUsername) {
  console.log("Choose another username");
} else {
  console.log("username available");
}

let score = 44;
if (typeof score === "number") {
  console.log("This is number");
} else {
  console.log("It is not a number");
}

let isAdmin = true;

if (isAdmin) {
  console.log("yes");
} else {
  console.log("no");
}

let items = [];

if (items.length === 0) {
  console.log("Array is empty");
} else {
  console.log("Array is not empty");
}
