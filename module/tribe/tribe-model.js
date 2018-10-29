const BaseModel = require('../base/base-model');

module.exports = {
  table: 't_tb_tribe',
  schema: Object.assign({
    name: 'string'
  }, BaseModel)
};