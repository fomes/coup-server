const gameUtils = require("./utils");
const constants = require("../utilities/constants");

class CoupGame {
  constructor(players, gameSocket) {
    this.nameSocketMap = gameUtils.buildNameSocketMap(players);
    this.nameIndexMap = gameUtils.buildNameIndexMap(players);
    this.players = gameUtils.buildPlayers(players);
    this.gameSocket = gameSocket;
    this.currentPlayer = 0;
    this.deck = gameUtils.buildDeck();
    this.winner = "";
    this.actions = constants.Actions;
    this.counterActions = constants.CounterActions;
    this.isChallengeBlockOpen = false;
    this.isRevealOpen = false;
    this.isChooseInfluenceOpen = false;
    this.isExchangeOpen = false;
    this.votes = 0;
  }

  resetGame(startingPlayer = 0) {
    this.currentPlayer = startingPlayer;
    this.isChallengeBlockOpen = false;
    this.isRevealOpen = false;
    this.isChooseInfluenceOpen = false;
    this.isExchangeOpen = false;
    this.aliveCount = this.players.length;
    this.votes = 0;
    this.deck = gameUtils.buildDeck();
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].money = 2;
      this.players[i].influences = [this.deck.pop(), this.deck.pop()];
      this.players[i].isDead = false;
    }
  }

  listen() {
    this.players.map((x) => {
      const socket = this.gameSocket.sockets[x.socketID];
      let bind = this;
      socket.on("g-playAgain", () => {
        if (bind.isPlayAgainOpen) {
          bind.isPlayAgainOpen = false;
          this.resetGame(Math.floor(Math.random() * this.players.length));
          this.updatePlayers();
          this.playTurn();
        }
      });
      socket.on("g-deductCoins", (res) => {
        const sourceIndex = bind.nameIndexMap[res.source];
        bind.players[sourceIndex].money -= res.amount;
        bind.updatePlayers();
      });
      socket.on("g-actionDecision", (res) => {
        if (bind.actions[res.action.action].isChallengeable) {
          bind.openChallenge(
            res.action,
            bind.actions[res.action.action].blockableBy.length > 0
          );
        } else if (res.action.action == "foreign_aid") {
          bind.isChallengeBlockOpen = true;
          bind.gameSocket.emit("g-openBlock", res.action);
        } else {
          bind.applyAction(res.action);
        }
      });
      socket.on("g-challengeDecision", (res) => {
        if (bind.isChallengeBlockOpen) {
          if (res.isChallenging) {
            bind.closeChallenge();
            bind.gameSocket.emit(
              "g-addLog",
              `${res.challenger} challenged ${res.challengee}`
            );
            bind.reveal(
              res.action,
              null,
              res.challengee,
              res.challenger,
              false
            );
          } else if (bind.votes + 1 == bind.aliveCount - 1) {
            bind.closeChallenge();
            bind.applyAction(res.action);
          } else {
            bind.votes += 1;
          }
        }
      });
      socket.on("g-blockChallengeDecision", (res) => {
        if (bind.isChallengeBlockOpen) {
          if (res.isChallenging) {
            bind.closeChallenge();
            bind.gameSocket.emit(
              "g-addLog",
              `${res.challenger} challenged ${res.challengee}'s block`
            );
            bind.reveal(
              res.prevAction,
              res.counterAction,
              res.challengee,
              res.challenger,
              true
            );
          } else if (bind.votes + 1 == bind.aliveCount - 1) {
            bind.closeChallenge();
            bind.nextTurn();
          } else {
            bind.votes += 1;
          }
        }
      });
      socket.on("g-blockDecision", (res) => {
        if (bind.isChallengeBlockOpen) {
          if (res.isBlocking) {
            bind.closeChallenge();
            bind.gameSocket.emit(
              "g-addLog",
              `${res.blocker} blocked ${res.blockee}`
            );
            bind.openBlockChallenge(
              res.counterAction,
              res.blockee,
              res.prevAction
            );
          } else if (bind.votes + 1 == bind.aliveCount - 1) {
            bind.closeChallenge();
            bind.applyAction(res.action);
          } else {
            bind.votes += 1;
          }
        }
      });
      socket.on("g-revealDecision", (res) => {
        const challengeeIndex = bind.nameIndexMap[res.challengee];
        const challengerIndex = bind.nameIndexMap[res.challenger];
        if (bind.isRevealOpen) {
          bind.isRevealOpen = false;
          if (res.isBlock) {
            if (
              res.revealedCard == res.counterAction.claim ||
              (res.counterAction.counterAction == "block_steal" &&
                (res.revealedCard == "ambassador" ||
                  res.revealedCard == "captain"))
            ) {
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challenger}'s challenge on ${res.challengee}'s block failed`
              );
              for (
                let i = 0;
                i < bind.players[challengeeIndex].influences.length;
                i++
              ) {
                if (
                  bind.players[challengeeIndex].influences[i] ==
                  res.revealedCard
                ) {
                  bind.deck.push(bind.players[challengeeIndex].influences[i]);
                  bind.deck = gameUtils.shuffleArray(bind.deck);
                  bind.players[challengeeIndex].influences.splice(i, 1);
                  bind.players[challengeeIndex].influences.push(
                    bind.deck.pop()
                  );
                  break;
                }
              }
              bind.updatePlayers();
              bind.isChooseInfluenceOpen = true;
              bind.gameSocket
                .to(bind.nameSocketMap[res.challenger])
                .emit("g-chooseInfluence");
              bind.nextTurn();
            } else {
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challenger}'s challenge on ${res.challengee}'s block succeeded`
              );
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challengee} lost their ${res.revealedCard}`
              );
              for (
                let i = 0;
                i < bind.players[challengeeIndex].influences.length;
                i++
              ) {
                if (
                  bind.players[challengeeIndex].influences[i] ==
                  res.revealedCard
                ) {
                  bind.deck.push(bind.players[challengeeIndex].influences[i]);
                  bind.deck = gameUtils.shuffleArray(bind.deck);
                  bind.players[challengeeIndex].influences.splice(i, 1);
                  break;
                }
              }
              bind.applyAction(res.prevAction);
            }
          } else {
            if (
              res.revealedCard == bind.actions[res.prevAction.action].influence
            ) {
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challenger}'s challenge on ${res.challengee} failed`
              );
              for (
                let i = 0;
                i < bind.players[challengeeIndex].influences.length;
                i++
              ) {
                if (
                  bind.players[challengeeIndex].influences[i] ==
                  res.revealedCard
                ) {
                  bind.deck.push(bind.players[challengeeIndex].influences[i]);
                  bind.deck = gameUtils.shuffleArray(bind.deck);
                  bind.players[challengeeIndex].influences.splice(i, 1);
                  bind.players[challengeeIndex].influences.push(
                    bind.deck.pop()
                  );
                  break;
                }
              }

              if (
                res.revealedCard == "assassin" &&
                res.prevAction.target == res.challenger &&
                bind.players[challengerIndex].influences.length == 2
              ) {
                bind.deck.push(bind.players[challengeeIndex].influences[0]);
                bind.deck = gameUtils.shuffleArray(bind.deck);
                bind.players[challengerIndex].influences.splice(0, 1);
              }
              bind.updatePlayers();
              bind.isChooseInfluenceOpen = true;
              bind.gameSocket
                .to(bind.nameSocketMap[res.challenger])
                .emit("g-chooseInfluence");
              bind.applyAction(res.prevAction);
            } else {
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challenger}'s challenge on ${res.challengee} succeeded`
              );
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challengee} lost their ${res.revealedCard}`
              );
              for (
                let i = 0;
                i < bind.players[challengeeIndex].influences.length;
                i++
              ) {
                if (
                  bind.players[challengeeIndex].influences[i] ==
                  res.revealedCard
                ) {
                  bind.deck.push(bind.players[challengeeIndex].influences[i]);
                  bind.deck = gameUtils.shuffleArray(bind.deck);
                  bind.players[challengeeIndex].influences.splice(i, 1);
                  break;
                }
              }
              bind.nextTurn();
            }
          }
        }
      });
      socket.on("g-chooseInfluenceDecision", (res) => {
        const playerIndex = bind.nameIndexMap[res.playerName];
        if (bind.isChooseInfluenceOpen) {
          bind.gameSocket.emit(
            "g-addLog",
            `${res.playerName} lost their ${res.influence}`
          );
          for (
            let i = 0;
            i < bind.players[playerIndex].influences.length;
            i++
          ) {
            if (bind.players[playerIndex].influences[i] == res.influence) {
              bind.deck.push(bind.players[playerIndex].influences[i]);
              bind.deck = gameUtils.shuffleArray(bind.deck);
              bind.players[playerIndex].influences.splice(i, 1);
              break;
            }
          }
          bind.isChooseInfluenceOpen = false;
          bind.nextTurn();
        }
      });
      socket.on("g-chooseExchangeDecision", (res) => {
        const playerIndex = bind.nameIndexMap[res.playerName];
        if (bind.isExchangeOpen) {
          bind.players[playerIndex].influences = res.kept;
          bind.deck.push(res.putBack[0]);
          bind.deck.push(res.putBack[1]);
          bind.deck = gameUtils.shuffleArray(bind.deck);
          bind.isExchangeOpen = false;
          bind.nextTurn();
        }
      });
    });
  }

  updatePlayers() {
    this.gameSocket.emit(
      "g-updatePlayers",
      gameUtils.exportPlayers(JSON.parse(JSON.stringify(this.players)))
    );
  }

  reveal(action, counterAction, challengee, challenger, isBlock) {
    const res = {
      action: action,
      counterAction: counterAction,
      challengee: challengee,
      challenger: challenger,
      isBlock: isBlock,
    };
    this.isRevealOpen = true;
    this.gameSocket
      .to(this.nameSocketMap[res.challengee])
      .emit("g-chooseReveal", res);
  }

  closeChallenge() {
    this.isChallengeBlockOpen = false;
    this.votes = 0;
    this.gameSocket.emit("g-closeChallenge");
    this.gameSocket.emit("g-closeBlock");
    this.gameSocket.emit("g-closeBlockChallenge");
  }

  openChallenge(action, isBlockable) {
    this.isChallengeBlockOpen = true;
    if (isBlockable && action.target != null) {
      let targetIndex = 0;
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == action.target) {
          targetIndex = i;
          break;
        }
      }
      this.gameSocket
        .to(this.players[targetIndex].socketID)
        .emit("g-openBlock", action);
    }
    this.gameSocket.emit("g-openChallenge", action);
  }

  openBlockChallenge(counterAction, blockee, prevAction) {
    this.isChallengeBlockOpen = true;
    this.gameSocket.emit("g-openBlockChallenge", {
      counterAction: counterAction,
      prevAction: prevAction,
    });
  }

  applyAction(action) {
    let logTarget = "";

    if (action.target) {
      logTarget = ` on ${action.target}`;
    }
    this.gameSocket.emit(
      "g-addLog",
      `${action.source} used ${action.action}${logTarget}`
    );
    const execute = action.action;
    const target = action.target;
    const source = action.source;
    if (execute == "income") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == source) {
          this.players[i].money += 1;
          break;
        }
      }
      this.nextTurn();
    } else if (execute == "foreign_aid") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == source) {
          this.players[i].money += 2;
          break;
        }
      }
      this.nextTurn();
    } else if (execute == "coup") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == target) {
          this.isChooseInfluenceOpen = true;
          this.gameSocket
            .to(this.nameSocketMap[target])
            .emit("g-chooseInfluence");
          break;
        }
      }
    } else if (execute == "tax") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == source) {
          this.players[i].money += 3;
          break;
        }
      }
      this.nextTurn();
    } else if (execute == "assassinate") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == target) {
          this.isChooseInfluenceOpen = true;
          this.gameSocket
            .to(this.nameSocketMap[target])
            .emit("g-chooseInfluence");
          break;
        }
      }
    } else if (execute == "exchange") {
      const drawTwo = [this.deck.pop(), this.deck.pop()];
      this.isExchangeOpen = true;
      this.gameSocket
        .to(this.nameSocketMap[source])
        .emit("g-openExchange", drawTwo);
    } else if (execute == "steal") {
      let stolen = 0;
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == target) {
          if (this.players[i].money >= 2) {
            this.players[i].money -= 2;
            stolen = 2;
          } else if (this.players[i].money == 1) {
            this.players[i].money -= 1;
            stolen = 1;
          } else {
          }
          break;
        }
      }
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == source) {
          this.players[i].money += stolen;
          break;
        }
      }
      this.nextTurn();
    } else {
      console.log("ERROR ACTION NOT FOUND");
    }
  }

  nextTurn() {
    console.log(
      !this.isChallengeBlockOpen,
      !this.isChooseInfluenceOpen,
      !this.isExchangeOpen,
      !this.isRevealOpen
    );
    if (
      !this.isChallengeBlockOpen &&
      !this.isChooseInfluenceOpen &&
      !this.isExchangeOpen &&
      !this.isRevealOpen
    ) {
      this.players.forEach((x) => {
        console.log(x.influences);
        if (x.influences.length == 0 && !x.isDead) {
          this.gameSocket.emit("g-addLog", `${x.name} is out!`);
          this.aliveCount -= 1;
          x.isDead = true;
          x.money = 0;
        }
      });
      this.updatePlayers();
      if (this.aliveCount == 1) {
        let winner = null;
        for (let i = 0; i < this.players.length; i++) {
          if (this.players[i].influences.length > 0) {
            winner = this.players[i].name;
          }
        }
        this.isPlayAgainOpen = true;
        this.gameSocket.emit("g-gameOver", winner);
      } else {
        do {
          this.currentPlayer += 1;
          this.currentPlayer %= this.players.length;
        } while (this.players[this.currentPlayer].isDead == true);
        this.playTurn();
      }
    }
  }

  playTurn() {
    this.gameSocket.emit(
      "g-updateCurrentPlayer",
      this.players[this.currentPlayer].name
    );
    console.log(this.players[this.currentPlayer].socketID);
    this.gameSocket
      .to(this.players[this.currentPlayer].socketID)
      .emit("g-chooseAction");
  }

  onChooseAction(action) {
    console.log("action", action);
  }

  start() {
    this.resetGame();
    this.listen();
    this.updatePlayers();
    console.log("Game has started");
    this.playTurn();
  }
}

module.exports = CoupGame;
