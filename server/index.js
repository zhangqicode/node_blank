
const express = require('express');

const app = express();
const DemoController = require('../module/demo_module/demo-controller');

class ZZServer {

  async init() {
    app.get('/', (req, res) => res.send('Hello World!'));
    app.get('/more', (req, res) => res.send('get more ...'));
    app.get('/demo', this.demo);
  }

  async demo(req, res) {
    DemoController.getAllDemos(req, res);
  }

  async start() {
    console.log('server start ...');
    await this.init();
    app.listen(3000, () => console.log(`Example app listening on port 3000 !`));
  }
}

module.exports = new ZZServer();