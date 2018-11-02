
const express = require('express');
const RoutesManager = require('./routes-manager');
const glob = require('glob');
const Promise = require('bluebird');
const globPromise = Promise.promisify(glob);
const path = require('path');

const app = express();

class ZZServer {

  async init() {
    // app.get('/', (req, res) => res.send('Hello World!'));
    // app.get('/more', (req, res) => res.send('get more ...'));
    // app.get('/demo', this.demo);
  }

  /**
   * 加载路由配置
   */
  async loadRoutes() {
    return globPromise(path.resolve(__dirname, '../module/**/*-routes\.js'), {})
      .then((files) => {
        files.forEach((file) => {
          const router = express.Router();
          const moduleFile = path.relative(__dirname, file);
          const moduleRoutes = require(`./${moduleFile}`);
          RoutesManager.configureRoutes(router, moduleRoutes);
          app.use(moduleRoutes.basePath, router);
        });

        return true;
      });
  }

  clientErrorHandler(err, req, res, next) {
    // logger.error({ err, reqNoBody: req }, `Uncatch: ${err.message}`);

    if (req.xhr) {
      let statusCode = res.statusCode || 500;
      if (Number(statusCode) === 200) {
        statusCode = 500;
      }
      return res.status(statusCode).json({ code: 0, err: { err_code: 0, message: err.message } });
    }
    return res.status(500).json({ code: 0, err: { err_code: 0, message: err.message } });
  }

  async start() {
    await this.init();
    await this.loadRoutes();
    app.use(this.clientErrorHandler);
    app.listen(3000, () => console.log(`Example app listening on port 3000 !`));
  }
}

module.exports = new ZZServer();