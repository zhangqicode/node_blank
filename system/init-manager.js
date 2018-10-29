/**
 * 服务启动时的配置管理类
 */
class InitManager {

  async start() {

    // init mysql
    await require('./mysql-manager').setUp();
  }
}

module.exports = new InitManager();