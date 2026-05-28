function multiply(a, b) {
  return a * b;
}

const multiplyExpr = (a, b) => {
  return a * b;
};

console.log(multiply(12,3))
console.log(multiplyExpr(12,1))


const user = {
  name: "Alice",
  greetLater: function() {
    // 'this' inside greetLater is the 'user' object.
    setTimeout(function() {
      // 'this' inside this regular callback function points to the global object (or undefined in strict mode).
      console.log(`Hello, my name is ${this.name}`); 
    }, 1000);
  }
};
user.greetLater();

const user1 = {
  name: "Alice",
  greetLater: function() {
    // The arrow function inherits 'this' from the outer function (greetLater).
    setTimeout(() => {
      console.log(`Hello, my name is ${this.name}`);
    }, 1000);
  }
};
user1.greetLater(); 


function logArgs(){
  console.log(arguments)
}
logArgs('a','b','c')

const logArgs1 = (...args) => {
  console.log(args); // ['a', 'b', 'c'] (This is a real Array, unlike the arguments object)
};
logArgs1('a', 'b', 'c');