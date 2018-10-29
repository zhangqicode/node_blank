const mysql = require('mysql');
const fs = require('fs');
const path = require('path');



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
    // for (const key of Object.keys(DataSourceConfig)) {
    //   const ds = DataSourceConfig[key];
    //   const { master, slaves } = ds;
    //   const _ds = new DataSource(key);
    //   _ds.loadMaster(master).loadSlaves(...slaves);
    //   this.dataSources.set(key, _ds);
    // }
    const _ds = new DataSource('tribe');
    _ds.loadMaster(dbConfig);
    this.dataSources.set('tribe', _ds);
    this.inited = true;
  }

  getDb() {
    return this.dataSources;
  }
}

module.exports = new DbManager();