const mysql = require('mysql');

/*
 * 这里需要填写自己的数据库配置
 */
const dbConfig = require('../private_config/mysql/test');

class DataSource {
  constructor(name) {
    this.name = name;
    this.poolCluster = mysql.createPoolCluster();
    this.slaveCount = 0;
  }

  /**
   * 加载master
   * @param {*} config
   */
  loadMaster(config) {
    this.poolCluster.add('MASTER', config);
    console.log('load master ...');
    return this;
  }

  /**
   * 加载slave
   * @param {*} slaves
   */
  loadSlaves(...slaves) {
    for (let ix = 0; ix < slaves.length; ix += 1) {
      ((i) => {
        const config = slaves[i];
        this.poolCluster.add(`SLAVE_${i}`, config);
        this.slaveCount += 1;
      })(ix);
    }
    return this;
  }

  async getMasterConnection() {
    return await new Promise((resolve, reject) => {
      this.poolCluster.getConnection('MASTER', (err, c) => {
        if (err) {
          return reject(err);
        }
        return resolve(c);
      });
    });
  }

  async getSlaveConnection() {
    const stub = this.slaveCount === 0 ? 'MASTER' : 'SLAVE*';
    return await new Promise((resolve, reject) => {
      this.poolCluster.getConnection(stub, (err, c) => {
        if (err) {
          return reject(err);
        }
        return resolve(c);
      });
    });
  }
}

class DbManager {

  constructor() {
    this.dataSources = new Map();
    this.inited = false;
  }

  async setUp() {
    if (this.inited) {
      return;
    }
    /*
     * dbConfig 中可能配置多个数据库，下面的 key 即是某个数据库的代号
     * 一个数据库可能有不同的主从库，一个主库，若干个从库，配置分别记录在 master 和 slaves 字段中，slaves 为数组
     */
    for (const key of Object.keys(dbConfig)) {
      const ds = dbConfig[key];
      const { master, slaves } = ds;
      const _ds = new DataSource(key);
      _ds.loadMaster(master).loadSlaves(...slaves);
      this.dataSources.set(key, _ds);
    }
    this.inited = true;
  }

  getDb() {
    return this.dataSources;
  }
}

module.exports = new DbManager();