let teaFlavors = ["green tea", "black tea", "ginger tea"];
const firstTea = teaFlavors[0];
console.log(firstTea);

let cities = ["London", "Tokyo", "Paris", "New York"];
const favoriteCity = cities[2];
console.log(favoriteCity);

teaFlavors[1] = "Jasmine tea";
console.log(teaFlavors);

cities.push("Berlin");
console.log(cities);

teaFlavors.pop();
console.log(teaFlavors);

// ! Array-SoftCopy

let popularTeas = ["green tea", "oolong tea", "ginger tea"];
let softCopyTeas = popularTeas;
popularTeas.pop();

console.log(popularTeas);
console.log(softCopyTeas);

// ! Array-HArdCopy
let topCities = ["Berlin", "Singapore", "New York"];
let hardCopyTopCities = [...topCities];
// Other methods- slice(),
topCities.pop();
console.log(topCities);
console.log(hardCopyTopCities);

// ! Array-Merge
let europeanCities = ["Paris", "Rome"];
let asianCities = ["Tokyo", "Bangkok"];
let worldCities = europeanCities.concat(asianCities);
console.log(worldCities);

// ! Array-includes()
let names = ["Rohit", "Ranjan", "Yadav"];

let isInList = names.includes("Rohit");
console.log(isInList);
