const BaseService = require('../base/base-service');
const DemoDao = require('./demo-dao');

class DemoService extends BaseService {
  constructor() {
    super();
    this.setDao(DemoDao);
  }

  async addDemo(params) {
    return await this.dao.addDemo(params);
  }

  async deleteDemo(id) {
    return await this.dao.deleteDemo(id);
  }

  async updateDemo(id, status) {
    return await this.dao.updateDemo(id, status);
  }

  async searchDemo(id) {
    return await this.dao.searchDemo(id);
  }

  async getAllDemos() {
    return await this.dao.getAllDemos();
  }
}

module.exports = new DemoService();
