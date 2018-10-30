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
   * 根据id更新记录
   * @param {*} id
   * @param {*} sets
   */
  async updateById(id, sets) {
    if (!sets) {
      return 0;
    }
    delete sets.id;
    return await this.dao.updateByTemplate({ id }, sets);
  }

  async findByTemplate(template = {}, orders, limits, parser) {
    return this.dao.findByTemplate(template, orders, limits, parser);
  }

}

module.exports = BaseService;
