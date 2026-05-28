let sum = 0;
let i = 1;
while (i <= 5) {
  sum += i;
  i++;
}
console.log(sum);

let countdown = [];
let j = 5;
while (j > 0) {
  countdown.push(j);
  j--;
}
console.log(countdown);

let total = 0;
let k = 1;
do {
  total += k;
  k++;
} while (k <= 3);
console.log(total);

let arr1 = [2, 4, 6];
let arr2 = [];
for (let i = 0; i < arr1.length; i++) {
  arr2.push(arr1[i] * 2);
}
console.log(arr2);

let teas = ["Black Tea", "Milk Tea", "Tea", "Lemon Tea"];
let selectedTeas = [];
for (let i = 0; i < teas.length; i++) {
  if (teas[i] === "Tea") {
    break;
  }
  selectedTeas.push(teas[i]);
}
console.log(selectedTeas);

let cities = ["London", "New York", "Paris", "Berlin"];
let visitedCities = [];
for (let i = 0; i < cities.length; i++) {
  if (cities[i] === "Paris") continue;
  visitedCities.push(cities[i]);
}
console.log(visitedCities);

let numbers = [1, 2, 3, 4, 5];
let smallNumbers = [];
for (const num of numbers) {
  if (num === 4) break;

  smallNumbers.push(num);
}
console.log(smallNumbers);

let citiesPopulation = {
  London: 73267856,
  "New York": 9387,
  Paris: 87486,
  Berlin: 83746,
};
let cityPopulation = {};
console.log(Object.keys(citiesPopulation));
for (const city in citiesPopulation) {
  if (city === "Berlin") break;
  cityPopulation[city] = citiesPopulation[city];
}
console.log(cityPopulation);

let people = {
  Rohit: 18,
  Ranjan: 14,
  Yadav: 20,
};
let adults = {};
for (const p in people) {
  if (people[p] < 18) continue;
  adults[p] = people[p];
}
console.log(adults);

// ? foreach, return
let names = ["Rohit", "Ranjan", "Yadav"];
let filteredNames = [];
names.forEach((name) => {
  if (name === "Ranjan") {
    return;
  }
  filteredNames.push(name);
});
console.log(filteredNames);

let numbers1 = [2, 5, 7, 9];
let doubledNumbers = [];

numbers1.forEach((num) => {
  if (num === 7) {
    return;
  }
  doubledNumbers.push(num * 2);
});
console.log(doubledNumbers);


