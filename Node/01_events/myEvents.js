const EventEmitter = require("events");

const eventEmitter = new EventEmitter();

eventEmitter.on("greet", (name) => {
  console.log(`Hello ${name} and welcome to events in nodejs`);
});

eventEmitter.emit("greet", "Rohit");

const myListener = () => console.log("This is test listener");
eventEmitter.on("test", myListener);
eventEmitter.emit("test");
