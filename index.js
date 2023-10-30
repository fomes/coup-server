const express = require("express");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: [process.env.APP_URL_LOCAL, process.env.APP_URL_WEB],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const server = require("http").createServer(app);
const io = require("socket.io")(server);
const CoupGame = require("./game/coup");

const utilities = require("./utilities/utilities");

const port = 8000;

let namespaces = {};

app.get("/createNamespace", function (req, res) {
  let newNamespace = "";
  while (newNamespace === "" || newNamespace in namespaces) {
    newNamespace = utilities.generateNamespace();
  }
  const newSocket = io.of(`/${newNamespace}`);
  openSocket(newSocket, `/${newNamespace}`);
  namespaces[newNamespace] = null;
  console.log(newNamespace + " CREATED");
  res.json({ namespace: newNamespace });
});

app.get("/exists/:namespace", function (req, res) {
  const namespace = req.params.namespace;
  res.json({ exists: namespace in namespaces });
});

app.get("/", function (req, res) {
  res.json({ message: "Hello Coup , 29-10-2023, 15:32" });
});

openSocket = (gameSocket, namespace) => {
  let players = [];
  let partyMembers = [];
  let partyLeader = "";
  let started = false;

  gameSocket.on("connection", (socket) => {
    console.log("id: " + socket.id);
    players.push({
      player: "",
      socket_id: `${socket.id}`,
      isReady: false,
    });
    console.log(`player ${players.length} has connected`);
    socket.join(socket.id);
    console.log("socket joined " + socket.id);
    const index = players.length - 1;

    const updatePartyList = () => {
      partyMembers = players
        .map((x) => {
          return { name: x.player, socketID: x.socket_id, isReady: x.isReady };
        })
        .filter((x) => x.name != "");
      console.log(partyMembers);
      gameSocket.emit("partyUpdate", partyMembers);
    };

    socket.on("setName", (name) => {
      console.log(started);
      if (started) {
        gameSocket
          .to(players[index].socket_id)
          .emit("joinFailed", "game_already_started");
        return;
      }
      if (!players.map((x) => x.player).includes(name)) {
        if (partyMembers.length >= 6) {
          gameSocket
            .to(players[index].socket_id)
            .emit("joinFailed", "party_full");
        } else {
          if (partyMembers.length == 0) {
            partyLeader = players[index].socket_id;
            players[index].isReady = true;
            gameSocket.to(players[index].socket_id).emit("leader");
            console.log("PARTY LEADER IS: " + partyLeader);
          }
          players[index].player = name;
          console.log(players[index]);
          updatePartyList();
          gameSocket
            .to(players[index].socket_id)
            .emit("joinSuccess", players[index].socket_id);
        }
      } else {
        gameSocket
          .to(players[index].socket_id)
          .emit("joinFailed", "name_taken");
      }
    });
    socket.on("setReady", (isReady) => {
      console.log(`${players[index].player} is ready`);
      players[index].isReady = isReady;
      updatePartyList();
      gameSocket.to(players[index].socket_id).emit("readyConfirm");
    });

    socket.on("startGameSignal", (players) => {
      started = true;
      gameSocket.emit("startGame");
      startGame(players, gameSocket, namespace);
    });

    socket.on("disconnect", () => {
      console.log("disconnected: " + socket.id);
      players.map((x, index) => {
        if (x.socket_id == socket.id) {
          gameSocket.emit(
            "g-addLog",
            `${JSON.stringify(players[index].player)} has disconnected`
          );
          gameSocket.emit("g-addLog", "Please recreate the game.");
          gameSocket.emit("g-addLog", "Sorry for the inconvenience (シ_ _)シ");
          players[index].player = "";
          if (socket.id === partyLeader) {
            console.log("Leader has disconnected");
            gameSocket.emit("leaderDisconnect", "leader_disconnected");
            socket.removeAllListeners();
            delete io.nsps[namespace];
            delete namespaces[namespace.substring(1)];
            players = [];
            partyMembers = [];
          }
        }
      });
      console.log(Object.keys(gameSocket["sockets"]).length);
      updatePartyList();
    });
  });
  let checkEmptyInterval = setInterval(() => {
    if (Object.keys(gameSocket["sockets"]).length == 0) {
      delete io.nsps[namespace];
      if (namespaces[namespace] != null) {
        delete namespaces[namespace.substring(1)];
      }
      clearInterval(checkEmptyInterval);
      console.log(namespace + "deleted");
    }
  }, 10000);
};

startGame = (players, gameSocket, namespace) => {
  namespaces[namespace.substring(1)] = new CoupGame(players, gameSocket);
  namespaces[namespace.substring(1)].start();
};

server.listen(process.env.PORT || port, function () {
  console.log(`listening on ${process.env.PORT || port}`);
});
