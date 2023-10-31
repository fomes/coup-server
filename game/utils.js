/**
 * MIT License

Copyright (c) 2020 Ethan Chen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

const constants = require("../utilities/constants");

buildDeck = () => {
  let deck = [];
  let cardNames = constants.CardNames.values();
  for (let card of cardNames) {
    addToDeck(card, deck);
  }

  deck = deck
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  return deck;
};

function addToDeck(cardName, deck) {
  if (!cardName || !deck) {
    console.log("cardName and deck must not be undefined.");
    return;
  }
  for (let i = 0; i < 3; i++) {
    deck.push(cardName);
  }
}

shuffleArray = (arr) => {
  if (!arr) {
    console.log(`arr must not be undefined. arr was ${arr}`);
  }

  for (let i = 0; i < arr.length * 2; i++) {
    const one = i % arr.length;
    const two = Math.floor(Math.random() * (arr.length - 1));
    let temp = arr[one];
    arr[one] = arr[two];
    arr[two] = temp;
  }
  return arr;
};

buildNameSocketMap = (players) => {
  let map = {};
  players.map((x) => {
    map[x.name] = x.socketID;
  });
  return map;
};

buildNameIndexMap = (players) => {
  let map = {};
  players.map((x, index) => {
    map[x.name] = index;
  });
  return map;
};

buildPlayers = (players) => {
  colors = [
    "#73C373",
    "#DD6C75",
    "#8C6CE6",
    "#CB8F8F",
    "#364968",
    "#F72464",
    "#033FFF",
  ];

  shuffleArray(colors);

  players.forEach((x) => {
    delete x.chosen;
    x.money = 2;
    x.influences = [];
    x.isDead = false;
    x.color = colors.pop();
    delete x.isReady;
  });
  console.log(players);
  return players;
};

exportPlayers = (players) => {
  players.forEach((x) => {
    delete x.socketID;
  });
  return players;
};

module.exports = {
  buildDeck: buildDeck,
  buildPlayers: buildPlayers,
  exportPlayers: exportPlayers,
  shuffleArray: shuffleArray,
  buildNameSocketMap: buildNameSocketMap,
  buildNameIndexMap: buildNameIndexMap,
};
