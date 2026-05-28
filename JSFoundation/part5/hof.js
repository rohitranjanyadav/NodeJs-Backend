/*
!.A Higher-Order Function is simply a function that does at least one of two things:
  *->Takes another function as an argument (often called a callback).
  *->Returns a function as its output.
*/

// Taking function as an argument-filter
const numbers = [1, 2, 3, 4, 5];
const evenNumbers = numbers.filter((num) => num % 2 === 0);
console.log(evenNumbers);

// Returning a function(closure)
function createMultiplier(multiplier) {
  return function (number) {
    return number * multiplier;
  };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(10));
console.log(triple(10));

// Write a HOF called repeat that takes a function fn and a number n, and calls that function n times.
function repeat(fn, n) {
  for (let i = 0; i < n; i++) {
    fn(i);
  }
}
repeat((index) => console.log(`Execution ${index}`), 3);

// Use the built-in .reduce() HOF to find the sum of all numbers in an array.
const prices = [10, 20, 30, 40, 50];

const total = prices.reduce((accumulator, currentPrice) => {
  return accumulator + currentPrice;
});

console.log(total);
