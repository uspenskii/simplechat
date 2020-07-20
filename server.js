const express = require("express"); //подключаем фреймворк, благодаря которой мы сможем запускать серверную часть
const {
  values
} = require("lodash");
//const useSocket = require("socket.io"); //подключаем socet.io

const app = express(); //создаем экспрессовское приложение
const server = require("http").Server(app); //подключение сервера, работающего через app приложение
const io = require("socket.io")(server); // подключаем socet.io и говорим серверу что такое сокеты

app.use(express.json()); //учим приложени принимать json данные


const rooms = new Map();

app.get("/rooms/:id", (req, res) => {
  //по гет запросу rooms должно взять из этой комнаты пользователей и сообщения и вернуть их при запросе
  const {
    id: roomId
  } = req.params;
  const obj = rooms.has(roomId) ? {
    users: [...rooms.get(roomId).get('users').values()],
    messages: [...rooms.get(roomId).get('messages').values()],
  } : {
    users: [],
    messages: []
  };
  res.json(obj);
});

app.post("/rooms", (req, res) => {
  const {
    roomId,
    userName
  } = req.body;
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map([
      ['users', new Map()],
      ['messages', []],
    ]), );
  }
  res.send();
});

io.on("connection", (socket) => {
  socket.on('ROOM:JOIN', ({
    roomId,
    userName
  }) => {
    socket.join(roomId); //подключаемся к сокету в определенную комнату
    rooms.get(roomId).get('users').set(socket.id, userName); //сохраняем всё это в нашей базе данных
    const users = [...rooms.get(roomId).get('users').values()]; //получаем список всех пользователей
    socket.to(roomId).broadcast.emit('ROOM:SET_USERS', users); //в определенную комнату всем кроме меня нужно отправить сокет запрос
  });

  socket.on('ROOM:NEW_MESSAGE', ({
    roomId,
    userName,
    text
  }) => {
    const obj = {
      userName,
      text
    };
    rooms.get(roomId).get('messages').push(obj);
    socket.to(roomId).broadcast.emit('ROOM:NEW_MESSAGE', obj);
  });

  socket.on('disconnect', () => {
    rooms.forEach((value, roomId) => {
      if (value.get('users').delete(socket.id)) {
        const users = [...value.get('users').values()]; //получаем список всех пользователей
        socket.to(roomId).broadcast.emit('ROOM:SET_USERS', users);
      }
    });
  });
  console.log("user connected", socket.id);
});

server.listen(9999, (err) => {
  if (err) {
    throw Error(err); //Оповещает об ошибках на сервере
  }
  console.log("Сервер запущен");
}); //запуск приложения на порту в браузере