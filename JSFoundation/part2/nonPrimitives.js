// ? Objects
const user = {
  firstName: "Rohit",
  "last Name": "Yadav",
  isLoggedIn: true,
};

console.log(user);

console.log(typeof user);
console.log(user.firstName);

user.firstName = "Ranjan";

console.log(user);
console.log(user["last Name"]);

// ? Arrays
let arr = ["Rohit", 1, true];

console.log(arr[0]);

// ! Implicit Type Coercion
console.log("1" + 1);

console.log(1 + 1 + "1");

let isValue = true;
console.log(true + 1);
