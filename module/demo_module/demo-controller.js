const BaseController = require('../base/base-controller');
const DemoService = require('./demo-service');

class DemoController extends BaseController {
  async addDemo(req, res) {
    const params = this.getParameters(req);
    try {
      await DemoService.addDemo(params);
      this.success(res, true);
    } catch (error) {
      this.failure(res, error);
    }
  }

  async deleteDemo(req, res) {
    const { id } = this.getParameters(req);

    try {
      const result = DemoService.deleteDemo(id);
      this.success(res, result);
    } catch (error) {
      this.failure(res, error);
    }
  }

  async updateDemo(req, res) {
    const { id, status } = this.getParameters(req);

    try {
      const result = DemoService.updateDemo(id, status);
      this.success(res, result);
    } catch (error) {
      this.failure(res, error);
    }
  }

  async searchDemo(req, res) {
    const { id } = this.getParameters(req);

    try {
      const result = await DemoService.searchDemo(id);
      this.success(res, result);
    } catch (error) {
      this.failure(res, error);
    }
  }

  async getAllDemos(req, res) {
    try {
      const result = await DemoService.getAllDemos();
      this.success(res, result);
    } catch (error) {
      this.failure(res, error);
    }
  }
}

module.exports = new DemoController();
