const BaseDao = require('../base/base-dao');
const TribeModel = require('./tribe-model');

class TribeDao extends BaseDao {
  constructor() {
    super();
    this.setModel(TribeModel);
    this.setDs('main');
  }

  async getTribe() {
    const sql = `select * from ${this.model.table}`;
    return this.find(sql).then((result) => {
      return result;
    });
  }
}

module.exports = new TribeDao();