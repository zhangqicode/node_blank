const joi = require('joi');
const _ = require('lodash');
const httpUtil = require('../util/http');

function validate(data, schema, errors) {
  if (schema) {
    const result = joi.validate(data, schema, { abortEarly: false });
    if (result.error) {
      errors.push(result.error);
    } else {
      _.assign(data, result.value);
    }
  }
}


function validationMiddleware(route, req, res, next) {
  const errors = [];
  if (route.validators) {
    validate(req.query, route.validators.query, errors);
    validate(req.body, route.validators.body, errors);
    validate(req.params, route.validators.path, errors);
  }

  if (errors.length > 0) {
    return httpUtil.responseBase(req, res, errors, 'Validation Error', 400);
  }
  return next();
}

function audit(req, res, next) {
  // logger.info({ reqNoBody: req }, `requestId: ${req.requestId}`);
  next();
}

function configureRoutes(expressRouter, moduleRoutes) {
  moduleRoutes.routes.forEach((route) => {
    let middlewares = [audit];
    middlewares.push(validationMiddleware.bind(this, route));
    const action = route.action;
    const actions = [];
    if (Array.isArray(action)) { // 处理多个监听器
      for (const ac of action) {
        actions.push(ac.bind(moduleRoutes._this));
      }
    } else {
      actions.push(action.bind(moduleRoutes._this));
    }
    // 添加统一的统计
    const _ac = actions[actions.length - 1];
    const sk = `${moduleRoutes.basePath}${route.path}`;
    actions[actions.length - 1] = async (req, res) => {
      const h = process.hrtime();
      await _ac(req, res);
      const [s, n] = process.hrtime(h);
      if (s > 1) { // 记录慢接口
        // logger.error({
        //   data: { interface: sk, timing: { s, n } }
        // }, 'slow interface');
      }
    };
    middlewares = middlewares.concat(actions);
    expressRouter[route.method](route.path, middlewares);
  });
}


module.exports = {
  configureRoutes
};
