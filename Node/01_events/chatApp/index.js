const ChatRoom = require("./chatRoom");

const chat = new ChatRoom();

chat.on("join", (user) => {
  console.log(`${user} has joined the chat`);
});

chat.on("message", (user, message) => {
  console.log(`${user} : ${message}`);
});

chat.on("leave", (user) => {
  console.log(`${user} has left the chat`);
});

// Simulating the Chat

chat.join("Rohit");
chat.join("Ranjan");

chat.sendMessage("Rohit", "Hello Ranjan, How are you?");
chat.sendMessage("Ranjan", "Hello Rohit, I am fine.");

chat.leave("Rohit");
chat.sendMessage("Rohit", "This will not run");

chat.leave("Ranjan");
