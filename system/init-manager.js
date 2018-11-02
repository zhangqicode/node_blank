/**
 * 服务启动时的配置管理类
 */
class InitManager {

  async start() {

    // globle error
    // const setLogger = require('../util/logger');
    // global.logger = setLogger('log', 0);

    // business error
    global.BusinessError = require('./error-manager').BusinessError;
    global.LoginError = require('./error-manager').LoginError;

    // init mysql
    await require('./mysql-manager').setUp();
  }
}

module.exports = new InitManager();