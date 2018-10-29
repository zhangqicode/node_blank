const _ = require('lodash');
const DbManger = require('../../system/mysql-manager');
// const RedisManger = require('../../system/redis-manager');
const mysql = require('mysql');

/**
 * 数据层基础类，提供基础的数据处理服务
 */
class BaseDao {
  constructor(model) {
    this.mysql = mysql;
    this.model = model;
    this.dataSources = DbManger.getDb();
    // this.cache = RedisManger.getMsgClient();
    this.ds = null;
    this.master = null;
    this.slave = null;
    this.setDs();
    // for (let i = 1; i < 16; i++) {
    //   this[`cache${i}`] = ((idx) => {
    //     return () => {
    //       return RedisManger.select(idx);
    //     };
    //   })(i);
    // }
  }

  setModel(model) {
    this.model = model;
    return this;
  }

  setDs(dsName = 'main') {
    this.ds = this.dataSources.get(dsName);
  }

  select(i) {
    this.cache = this[`cache${i}`]();
  }

  get _cache() {
    return this.cache;
  }

  /**
   * 取得Master连接池里面的连接
   */
  async atMaster() {
    return await this.ds.getMasterConnection();
  }

  /**
  * 取得Master连接池里面的连接
  */
  async atSlave() {
    return await this.ds.getSlaveConnection();
  }

  async getConnection() {
    return this.atMaster();
  }

  /**
   * 根据指定的sql查询结果集
   * @param {*} sql
   * @param {*} params
   */
  async find(sql, ...params) {
    let parser = null;
    if (params) {
      params = params.filter(o => typeof o !== 'undefined');
      if (typeof params[params.length - 1] === 'function') {
        parser = params[params.length - 1];
        params.splice(params.length - 1);
      }
      if (params.length) {
        sql = mysql.format(sql, params);
      }
    }

    const self = this;
    const conn = await this.atSlave();
    return await new Promise((resolve, reject) => {
      conn.query(sql, (err, results, fields) => {
        conn.release();
        if (err) {
          return reject(err);
        }
        if (!parser) {
          parser = self.parser.bind(self);
        }
        return resolve(results.map(data => parser(data, fields)));
      });
    });
  }

  /**
   * 根据指定的sql查询结果集，从主库里面获取
   * @param {*} sql
   * @param {*} params
   */
  async findFromMaster(sql, ...params) {
    let parser = null;
    if (params) {
      params = params.filter(o => typeof o !== 'undefined');
      if (typeof params[params.length - 1] === 'function') {
        parser = params[params.length - 1];
        params.splice(params.length - 1);
      }
      if (params.length) {
        sql = mysql.format(sql, params);
      }
    }

    const self = this;
    const conn = await this.atMaster();
    return await new Promise((resolve, reject) => {
      conn.query(sql, (err, results, fields) => {
        conn.release();
        if (err) {
          return reject(err);
        }
        if (!parser) {
          parser = self.parser.bind(self);
        }
        return resolve(results.map(data => parser(data, fields)));
      });
    });
  }

  /**
   * 根据指定的sql查询结果集
   * @param {*} conn
   * @param {*} sql
   * @param {*} params
   */
  async trxFind(conn, sql, ...params) {
    let parser = null;
    if (params && params.length > 0) {
      params = params.filter(o => typeof o !== 'undefined');
      if (typeof params[params.length - 1] === 'function') {
        parser = params[params.length - 1];
        params.splice(params.length - 1);
      }
      if (params.length) {
        sql = mysql.format(sql, params);
      }
    }
    const self = this;
    return await new Promise((resolve, reject) => {
      conn.query(sql, (err, results, fields) => {
        if (err) {
          return reject(err);
        }
        if (!parser) {
          parser = self.parser.bind(self);
        }
        return resolve(results.map(data => parser(data, fields)));
      });
    });
  }

  /**
   * 默认的结果集解析器
   * 查询语句也可以在查询条件最后一个参数传递结果解析器
   * @param {*} row  当前行
   * @param {*} fields 结果集的field
   */
  /* eslint-disable */
  parser(row, fields) {
    return row;
  }

  allFields() {
    this.checkModel();
    return Object.keys(this.model.schema).map(v => `\`${v}\``).join(',');
  }

  /**
   * 查询所有记录
   * note: 结果集没有排序
   */
  async findAll() {
    const sql = `SELECT ${this.allFields()} FROM ${this.model.table}`;
    return await this.find(sql);
  }

  /**
   * 检查model
   */
  checkModel() {
    if (!this.model) {
      throw new Error('model is required');
    }
  }

  /**
   * 创建记录，返回插入的id
   * @param {*} entity 实体类
   */
  async create(entity) {
    this.checkModel();
    const sql = `INSERT INTO ${this.model.table} SET ? `;
    const conn = await this.atMaster();
    return await new Promise((resolve, reject) => {
      conn.query(sql, entity, (err, results) => {
        conn.release();
        if (err) {
          return reject(err);
        }
        return resolve(results.insertId);
      });
    });
  }

  /**
   * 创建记录，返回插入的id
   * @param {*} conn
   * @param {*} entity 实体类
   */
  async trxCreate(conn, entity, tableName) {
    this.checkModel();
    const sql = `INSERT INTO ${tableName || this.model.table} SET ? `;
    return await new Promise((resolve, reject) => {
      conn.query(sql, entity, (err, results) => {
        if (err) {
          return reject(err);
        }
        return resolve(results.insertId);
      });
    });
  }

  /**
   * 更新记录
   * @param {*} sql
   * @param {*} params
   */
  async update(sql, ...params) {
    const results = await this.updateS(sql, ...params);
    return results.changedRows;
  }

  /**
   * 更新记录
   * @param {*} sql
   * @param {*} params
   */
  async updateS(sql, ...params) {
    sql = mysql.format(sql, params);
    const conn = await this.atMaster();
    return await new Promise((resolve, reject) => {
      conn.query(sql, (err, results) => {
        conn.release();
        if (err) {
          return reject(err);
        }
        return resolve(results);
      });
    });
  }

  /**
   * 添加多条记录
   * @param {*} sql
   * @param {*} params
   */
  async insertMany(rows) {
    if (!rows || !rows.length) {
      return 0;
    }

    const keys = Object.keys(rows[0]);
    let sql = `INSERT INTO ${this.model.table} (${keys.join(',')}) VALUES `;
    let values = '';

    const formatVals = (row) => {
      const vals = [];
      keys.forEach((key) => {
        if (row[key] === null || row[key] === undefined) {
          vals.push('NULL');
        } else {
          vals.push(JSON.stringify(row[key].toString()));
        }
      })
      return vals.join(', ');
    }

    rows.forEach((row, i) => {
      if (i > 0) {
        values += ','
      }
      values += `(${formatVals(row)})`;
    });

    sql += values;
    sql = mysql.format(sql);

    const conn = await this.atMaster();
    return await new Promise((resolve, reject) => {
      conn.query(sql, (err, results) => {
        conn.release();
        if (err) {
          return reject(err);
        }
        return resolve(results.changedRows);
      });
    });
  }

  /**
   * 更新记录
   * @param {*} conn
   * @param {*} sql
   * @param {*} params
   */
  async trxUpdate(conn, sql, ...params) {
    sql = mysql.format(sql, params);
    return await new Promise((resolve, reject) => {
      conn.query(sql, (err, results) => {
        if (err) {
          return reject(err);
        }
        return resolve(results.changedRows);
      });
    });
  }

  /**
   * 根据实体模板更新记录
   * @param {*} entity 被更新的对象
   */
  async updateModel(entity) {
    if (!entity) {
      throw new Error('invalid entity to update');
    }
    if (!entity.id) {
      throw new Error('updateModel id is required');
    }
    const id = entity.id;
    delete entity.id;
    return await this.updateByTemplate({ id }, entity);
  }

  /**
   * 查询符合条件的记录数
   * @param {*} sql
   * @param {*} params
   */
  async count(sql, ...params) {
    sql = mysql.format(sql, params);
    const getCount = (results) => {
      if (!results || !results.length) {
        throw new Error('invalid count result');
      }
      const rst = results[0];
      return rst[Object.keys(rst)[0]];
    };
    const conn = await this.atSlave();
    return await new Promise((resolve, reject) => {
      conn.query(sql, (err, results) => {
        conn.release();
        if (err) {
          return reject(err);
        }
        return resolve(getCount(results));
      });
    });
  }

  /**
   * 根据id查询记录
   * @param {*} id
   * @param {*} parser
   */
  async findById(id, parser) {
    const sql = `SELECT ${this.allFields()} FROM ${this.model.table} where id = ?`;
    const results = await this.find(sql, id, parser);
    if (results.length) {
      return results[0];
    }
    return null;
  }

  /**
   * 根据id查询记录
   * @param {*} id
   * @param {*} parser
   */
  async findByIds(ids, parser) {
    if (!ids.length) {
      return []
    }
    const sql = `SELECT ${this.allFields()} FROM ${this.model.table}
    WHERE id in(${Array.from({ length: ids.length }, () => '?').join(',')})`;
    return this.find(sql, ...ids, parser);
  }

  /**
   *
   * @param {*} conn
   * @param {*} id
   */
  async trxFindById(conn, id) {
    const sql = `SELECT ${this.allFields()} FROM ${this.model.table} where id = ? `;
    const res = await this.trxFind(conn, sql, id);
    if (res.length) {
      return res[0];
    }
    return null;
  }

  /**
   * 根据指定的模板获取记录
   * @param {*} template
   */
  async findByTemplate(template = {}, orders, limits, parser) {
    const sqlAppender = [`SELECT ${this.allFields()} FROM ${this.model.table} WHERE 1 = 1 `];
    const params = [];
    for (const key of Object.keys(template)) {
      const value = template[key];

      if (_.isArray(value)) {
        const placeHolder = _.fill(Array(value.length), '?').join(',');
        sqlAppender.push(` AND \`${key}\` IN (${placeHolder}) `);
        _.forEach(value, (val) => {
          params.push(val);
        });
      } else {
        sqlAppender.push(` AND \`${key}\`=? `);
        params.push(template[key]);
      }
    }

    // add order clause
    if (orders && orders.length) {
      sqlAppender.push(' ORDER BY ');
      for (const ord of orders) {
        const [key, dire] = ord;
        const di = dire === 1 ||
          dire === '1' ||
          dire === 'ASC' ||
          dire === 'asc' ? 'ASC' : 'DESC';
        sqlAppender.push(` \`${key}\` ${di},`);
      }
      const _last = sqlAppender[sqlAppender.length - 1];
      sqlAppender[sqlAppender.length - 1] = _last.substring(0, _last.length - 1);
    }

    // add limit clause
    if (limits && limits.length) {
      let lim;
      if (limits.length === 1) {
        lim = ` LIMIT ${limits[0]} `;
      } else {
        lim = ` LIMIT ${limits[0]}, ${limits[1]} `;
      }
      sqlAppender.push(lim);
    }
    if (parser) {
      params.push(parser);
    }
    return await this.find(sqlAppender.join(' '), ...params);
  }

  /**
   * 根据指定的模板获取记录
   * @param {*} template
   */
  async findAdvanced(template = [], orders, limits, parser) {
    const sqlAppender = [`SELECT ${this.allFields()} FROM ${this.model.table} WHERE 1=1 `];
    const params = [];

    if (template.length) {
      template.forEach((item) => {
        sqlAppender.push(` AND ${item.join(' ')}`)
      })
    }

    // add order clause
    if (orders && orders.length) {
      sqlAppender.push(' ORDER BY ');
      for (const ord of orders) {
        const [key, dire] = ord;
        const di = dire === 1 ||
          dire === '1' ||
          dire === 'ASC' ||
          dire === 'asc' ? 'ASC' : 'DESC';
        sqlAppender.push(` ${key} ${di},`);
      }
      const _last = sqlAppender[sqlAppender.length - 1];
      sqlAppender[sqlAppender.length - 1] = _last.substring(0, _last.length - 1);
    }

    // add limit clause
    if (limits && limits.length) {
      let lim;
      if (limits.length === 1) {
        lim = ` LIMIT ${limits[0]} `;
      } else {
        lim = ` LIMIT ${limits[0]}, ${limits[1]} `;
      }
      sqlAppender.push(lim);
    }
    if (parser) {
      params.push(parser);
    }
    return await this.find(sqlAppender.join(' '), ...params);
  }

  /**
   * 根据条件更新记录
   * @param {*} template 条件模板
   * @param {*} sets
   */
  async updateByTemplate(template, sets) {
    this.checkModel();
    const conditionKeys = Object.keys(template);
    const setsKeys = Object.keys(sets);
    if (!setsKeys.length) {
      return 0;
    }
    const params = [];
    const sqlAppender = [`UPDATE ${this.model.table} SET `];
    for (const key of setsKeys) {
      sqlAppender[sqlAppender.length] = ` \`${key}\` = ? ,`;
      params[params.length] = sets[key];
    }
    let _last = sqlAppender[sqlAppender.length - 1];
    sqlAppender[sqlAppender.length - 1] = _last.substring(0, _last.length - 1); // remove last ,
    if (conditionKeys.length) {
      sqlAppender[sqlAppender.length] = 'WHERE ';
      for (const key of conditionKeys) {
        sqlAppender[sqlAppender.length] = ` \`${key}\` = ? AND`;
        params[params.length] = template[key];
      }
      _last = sqlAppender[sqlAppender.length - 1];
      sqlAppender[sqlAppender.length - 1] = _last.substring(0, _last.length - 3); // remove last and
    }
    return await this.update(sqlAppender.join(' '), ...params);
  }

  /**
   * 在事务中更新数据
   * @param {*} conn
   * @param {*} template
   * @param {*} sets
   */
  async trxUpdateByTemplate(conn, template, sets) {
    this.checkModel();
    const conditionKeys = Object.keys(template);
    const setsKeys = Object.keys(sets);
    if (!setsKeys.length) {
      return 0;
    }
    const params = [];
    const sqlAppender = [`UPDATE ${this.model.table} SET `];
    for (const key of setsKeys) {
      sqlAppender[sqlAppender.length] = ` \`${key}\` = ? ,`;
      params[params.length] = sets[key];
    }
    let _last = sqlAppender[sqlAppender.length - 1];
    sqlAppender[sqlAppender.length - 1] = _last.substring(0, _last.length - 1); // remove last ,
    if (conditionKeys.length) {
      sqlAppender[sqlAppender.length] = 'WHERE ';
      for (const key of conditionKeys) {
        sqlAppender[sqlAppender.length] = ` \`${key}\` = ? AND`;
        params[params.length] = template[key];
      }
      _last = sqlAppender[sqlAppender.length - 1];
      sqlAppender[sqlAppender.length - 1] = _last.substring(0, _last.length - 3); // remove last and
    }
    return await this.trxUpdate(conn, sqlAppender.join(' '), ...params);
  }

  /**
   * 根据模板查询某一条记录
   * @param {*} template
   * @param {*} orders
   */
  async findOneByTemplate(template, orders) {
    const results = await this.findByTemplate(template, orders, [1]);
    if (results.length) {
      return results[0];
    }
    return null;
  }

  /**
   * 查询某条件的总记录数
   */
  async countByTemplate(template = {}) {
    const sqlAppender = [` SELECT COUNT(1) FROM ${this.model.table} `];
    const keys = Object.keys(template);
    const params = [];
    if (keys.length) {
      sqlAppender[sqlAppender.length] = ' WHERE 1=1 ';
      for (const key of keys) {
        sqlAppender[sqlAppender.length] = `AND \`${key}\`=?`;
        params.push(template[key]);
      }
    }
    return await this.count(sqlAppender.join(' '), ...params);
  }

  /**
   * 查询某条件的总记录数
   */
  async countAdvanced(template = []) {
    const sqlAppender = [` SELECT COUNT(1) FROM ${this.model.table} `];

    const params = [];
    if (template.length) {
      sqlAppender[sqlAppender.length] = ' WHERE 1=1 ';

      template.forEach((item) => {
        sqlAppender[sqlAppender.length] = ` AND ${item.join(' ')}`;
      });
    }
    return await this.count(sqlAppender.join(' '), ...params);
  }

  /**
   * 根据id删除记录
   * @param {*} id
   */
  async removeById(id) {
    const sql = `DELETE FROM ${this.model.table} where id = ?`;
    const results = await this.update(sql, id);
    if (results.length) {
      return results[0];
    }
    return null;
  }

  async beginTrx(conn) {
    return await new Promise((resolve, reject) => {
      conn.beginTransaction((err) => {
        if (err) {
          return reject(err);
        }
        return resolve(conn);
      });
    });
  }

  async commitTrx(conn) {
    return await new Promise((resolve, reject) => {
      conn.commit((err) => {
        if (err) {
          return reject(err);
        }
        return resolve(conn);
      });
    });
  }

  async rollbackTrx(conn) {
    return await new Promise((resolve, reject) => {
      conn.rollback((err) => {
        if (err) {
          return reject(err);
        }
        return resolve(conn);
      });
    });
  }

  async trxInsertMany(conn, entities) {
    if (!entities) {
      return 0;
    }
    entities = entities.filter(e => e !== undefined && e !== null);
    if (!entities.length) {
      return 0;
    }
    const keys = Object.keys(entities[0]).sort(() => 1);
    const sqlAppender = [];
    const params = [];
    const len = keys.length;
    const lastIdx = len - 1;

    // insert into table (`a`, `b`, `c`)
    sqlAppender[sqlAppender.length] = `INSERT INTO ${this.model.table} (`;
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      sqlAppender[sqlAppender.length] = `\`${key}\``;
      if (i !== lastIdx) {
        sqlAppender[sqlAppender.length] = ','
      } else {
        sqlAppender[sqlAppender.length] = ') '
      }
    }

    // valuse
    sqlAppender[sqlAppender.length] = ' VALUES '

    // (?, ?, ?), (?, ?, ?)
    for (let i = 0; i < entities.length; i += 1) { // O(n^2)
      const entity = entities[i];
      sqlAppender[sqlAppender.length] = ' ('
      for (let i = 0; i < keys.length; i += 1) {
        sqlAppender[sqlAppender.length] = '?';
        if (i !== lastIdx) {
          sqlAppender[sqlAppender.length] = ',';
        } else {
          sqlAppender[sqlAppender.length] = ') ';
        }
        params[params.length] = entity[keys[i]];
      }
      if (i != entities.length - 1) {
        sqlAppender[sqlAppender.length] = ',';
      }
    }

    const sql = sqlAppender.join(' ');
    return this.trxUpdate(conn, sql, ...params);
  }
}

module.exports = BaseDao;
