const rp = require('request-promise');

/**
 * 服务层基础类，提供服务层的基础服务
 */
class BaseService {
  setDao(dao) {
    this.dao = dao;
  }

  /**
   * 查询所有记录
   */
  async findAll() {
    return await this.dao.findAll();
  }

  /**
   * 创建记录
   * @param {*} object
   */
  async create(object) {
    const id = await this.dao.create(object);
    object.id = id;
    return object;
  }

  async trxCreate(conn, object) {
    const id = await this.dao.trxCreate(conn, object);
    object.id = id;
    return object;
  }

  /**
   * 根据id查找记录
   * @param {*} id
   * @param {*} parser
   */
  async findById(id, parser) {
    return await this.dao.findById(id, parser);
  }

  /**
   * 根据id跟新记录
   * @param {*} id
   * @param {*} sets
   */
  async updateById(id, sets) {
    if (!sets) {
      return 0;
    }
    delete sets.id;
    // sets.id = id;
    return await this.dao.updateByTemplate({ id }, sets);
  }

  async findByTemplate(template = {}, orders, limits, parser) {
    return this.dao.findByTemplate(template, orders, limits, parser);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request({ base_url, method, url, data, type }) {
    if (!method || !url) {
      throw new Error('lack of method or url');
    }

    const qs = {};
    const body = {};
    let res = {};

    Object.assign(method.toLocaleLowerCase() === 'get' ? qs : body, data || {});

    try {
      res = await rp({
        method,
        uri: `${base_url}${url}`,
        body: data,
        json: true
      });
    } catch (err) {
      logger.error({ err }, `${url} error`);
    }

    if (type === 'tingRequest' && res.err === null) {
      return res;
    }

    if (type === 'tribeRequest' && res.code === 1) {
      return res;
    }

    logger.error({ err: res.err }, `${url} error`);
    throw new BusinessError({ type, url, err: res.err }, 99999999);
  }

  async tingRequest({ method, url, data }) {
    const env_str = process.env.NODE_ENV !== 'production' ? '-tst' : '';
    const base_url = `http://yktt-internal${env_str}.tinfinite.com/api`;
    // const base_url = 'http://127.0.0.1:3003/api';

    return await this.request({ base_url, method, url, data, type: 'tingRequest' });
  }

  async tribeRequest({ method, url, data }) {
    const env_str = process.env.NODE_ENV !== 'production' ? '-dev' : '';
    const base_url = `http://tribe${env_str}.tinfinite.com/candy`;
    // const base_url = 'http://127.0.0.1:3003/candy';

    return await this.request({ base_url, method, url, data, type: 'tribeRequest' });
  }
}

module.exports = BaseService;
