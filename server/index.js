
const express = require('express');

const app = express();
const tribeDao = require('../module/tribe/tribe-dao');

class ZZServer {

  async init() {
    app.get('/', (req, res) => res.send('Hello World!'));
    app.get('/more', (req, res) => res.send('get more ...'));
    app.get('/tribe', this.getTribe);
  }

  async getTribe(req, res) {
    console.log('get tribe start... ');
    const tribes = await tribeDao.getTribe();
    res.send(tribes);
  }

  async start() {
    console.log('server start ...');
    await this.init();
    app.listen(3000, () => console.log(`Example app listening on port 3000 !`));
  }
}

module.exports = new ZZServer();