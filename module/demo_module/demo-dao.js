const BaseDao = require('../base/base-dao');
const DemoModel = require('./demo-model');

class DemoDao extends BaseDao {
  constructor() {
    super();
    this.setModel(DemoModel);
  }

  async addDemo(params) {
    return await this.create(params);
  }

  async deleteDemo(id) {
    // 假删除，将 status 标为0，在查询中不可见
    return await this.updateByTemplate({ id }, { status: 0 });
  }

  async updateDemo(id, status) {
    return await this.updateByTemplate({ id }, { status });
  }

  async searchDemo(id) {
    return await this.findByTemplate({ id, status : 1 });
  }

  // 我觉得有必要写个用 sql 的
  async getAllDemos() {
    let sql = `select * from ${this.model.table} where status = ?`;

    return await this.find(sql, 1);
  }
}

module.exports = new DemoDao();