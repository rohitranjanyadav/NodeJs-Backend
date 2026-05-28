let balance = 120;
// Not recommended to create objects
let anotherBalance = new Number(120);

// console.log(balance);
// console.log(anotherBalance);
// console.log(anotherBalance.valueOf());

console.log(typeof balance);
console.log(typeof anotherBalance);

let isActive = true;
let isReallyActive = new Boolean(true);

// null and undefined
let firstName;
console.log(firstName);

let age = null;
console.log(age);

// String
let myString = "Hello";
let name = "Rohit";

let greetMsg = `${myString} ${name} Welcome`;
console.log(greetMsg);

// Symbol -> Unique - provides uniqueness each and every time used
let sm1 = Symbol();
let sm2 = Symbol();
console.log(sm1 == sm2);
