const BaseModel = require('../base/base-model');

module.exports = {
  table: 't_tag',
  schema: Object.assign({
    name: 'string',
    description: 'string',
    type: 'number',
    extra: 'string',
    status: 'number'
  }, BaseModel)
};