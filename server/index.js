
const express = require('express');

const app = express();

class ZZServer {

  async init() {
    app.get('/', (req, res) => res.send('Hello World!'));
    app.get('/more', (req, res) => res.send('get more ...'));
  }

  async start() {
    console.log('server start ...');
    await this.init();
    app.listen(3000, () => console.log(`Example app listening on port 3000 !`));
  }
}

module.exports = new ZZServer();