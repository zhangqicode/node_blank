
const BaseDao = require('./base-dao');

const PROXY_EXCLUDES = [
  'model',
  'master',
  'slave',
  'dataSources',
  'ds'
];

/**
 * methods except sharding
 */
const AOP_EXCLUDES = ['constructor',
  'setModel',
  'setDs',
  'parser',
  'allFields',
  'checkModel',
  'beginTrx',
  'commitTrx',
  'rollbackTrx',
  'getInvoker',
  'lookupTbl',
  'proxy',
  'aop'];

class ShardDao {
  constructor(baseModel, dsLookUpFunc, lookUpFunc, validFunc, cacheSelectFunc) {
    if (!baseModel) {
      throw new Error('model is required for shard dao');
    }
    if (!baseModel.table || !baseModel.schema) {
      throw new Error('table and schema is required for shard dao model');
    }
    if (!dsLookUpFunc || (typeof dsLookUpFunc !== 'function')) {
      throw new Error('datasource lookup function is required for shard dao');
    }
    if (!lookUpFunc || (typeof lookUpFunc !== 'function')) {
      throw new Error('lookup function is required for shard dao');
    }
    if (!validFunc || (typeof validFunc !== 'function')) {
      throw new Error('lookup function is required for shard dao');
    }
    this.model = baseModel;
    this.lookUpFunc = lookUpFunc;
    this.dsLookUpFunc = dsLookUpFunc;
    this.validFunc = validFunc;
    this.cacheSelectFunc = cacheSelectFunc;
    this.shards = new Map();

    this.proxy(BaseDao);
    //  this.__proto__
    //  ShardDao.prototype
    this.aop(BaseDao.prototype);
  }

  proxy(...klass) {
    for (const kla of klass) {
      const obj = new kla();
      if (this.cacheSelectFunc) { // 是否需要选择redis db 作为默认的缓存数据库
        obj.select(this.cacheSelectFunc());
      }
      for (const i of Object.keys(obj)) {
        if (PROXY_EXCLUDES.includes(i)) {
          continue;
        }
        this[i] = obj[i];
      }
    }
  }

  getInvoker(shardObj) {
    const hash = this.lookUpFunc(shardObj);
    let invoker = this.shards.get(hash);
    if (invoker) {
      return invoker;
    }
    if (!this.validFunc(hash)) {
      throw new Error('invalid sharding hash for shard dao');
    }
    invoker = new BaseDao();
    invoker.setModel(Object.assign({}, this.model, { table: `${this.model.table}_${hash}` }));
    invoker.setDs(this.dsLookUpFunc(hash));
    if (this.cacheSelectFunc) { // 是否需要选择redis db 作为默认的缓存数据库
      invoker.select(this.cacheSelectFunc());
    }
    this.shards.set(hash, invoker);
    return invoker;
  }

  // 根据 shard key 查找 dest table
  lookupTbl(lo) {
    const hash = this.lookUpFunc(lo);
    if (!this.validFunc(hash)) {
      throw new Error('invalid sharding hash for shard dao');
    }
    return `${this.model.table}_${hash}`;
  }

  aop(...clazzs) {
    for (const clazz of clazzs) {
      const keys = Object.getOwnPropertyNames(clazz);

      for (const key of keys) {
        if (typeof clazz[key] === 'function') {
          if (AOP_EXCLUDES.includes(key)) {
            this[key] = clazz[key];
            continue;
          }
          const func = clazz[key];
          this[key] = async (...args) => {
            const shardObj = args.shift();
            return func.apply(this.getInvoker(shardObj), args);
          };
        } else {
          this[key] = clazz[key];
        }
      }
    }
  }
}

module.exports = ShardDao;
