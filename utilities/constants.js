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

const CardNames = {
  DUKE: "duke",
  ASSASSIN: "assassin",
  CAPTAIN: "captain",
  AMBASSADOR: "ambassador",
  CONTESSA: "contessa",
  values: function () {
    return [
      this.DUKE,
      this.ASSASSIN,
      this.CAPTAIN,
      this.AMBASSADOR,
      this.CONTESSA,
    ];
  },
};

const Actions = {
  income: {
    influence: "all",
    blockableBy: [],
    isChallengeable: false,
    moneyDelta: 1,
  },
  foreign_aid: {
    influence: "all",
    blockableBy: [CardNames.DUKE],
    isChallengeable: false,
    moneyDelta: 2,
  },
  coup: {
    influence: "all",
    blockableBy: [],
    isChallengeable: false,
    moneyDelta: -7,
  },
  tax: {
    influence: CardNames.DUKE,
    blockableBy: [],
    isChallengeable: true,
    moneyDelta: 3,
  },
  assassinate: {
    influence: CardNames.ASSASSIN,
    blockableBy: [CardNames.CONTESSA],
    isChallengeable: true,
    moneyDelta: -3,
  },
  exchange: {
    influence: CardNames.AMBASSADOR,
    blockableBy: [],
    isChallengeable: true,
    moneyDelta: 0,
  },
  steal: {
    influence: CardNames.CAPTAIN,
    blockableBy: [CardNames.AMBASSADOR, CardNames.AMBASSADOR],
    isChallengeable: true,
    moneyDelta: 2,
  },
};

const CounterActions = {
  block_foreign_aid: {
    influences: [CardNames.DUKE],
  },
  block_steal: {
    influences: [CardNames.AMBASSADOR, CardNames.CAPTAIN],
  },
  block_assassinate: {
    influences: [CardNames.CONTESSA],
  },
};

module.exports = {
  CardNames: CardNames,
  Actions: Actions,
  CounterActions: CounterActions,
};
