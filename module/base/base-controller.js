
/**
 * 控制层基础类，提供基础的请求处理服务
 */
class BaseController {
  /**
   * 返回成功的请求
   * @param {*} res
   * @param {*} data
   */
  success(res, data) {
    res.json({
      code: 1,
      data
    });
  }

  /**
   * 返回失败的请求
   * @param {*} res
   * @param {*} err
   */
  failure(res, err) {
    // logger.error({ err }, 'request error!');
    let _err;
    let status;
    if (err instanceof BusinessError) {
      status = 200;
      _err = {
        err_code: err.code,
        message: err.message
      };
    } else if (err instanceof LoginError) {
      status = 401;
      _err = {
        err_code: err.code,
        message: err.message
      };
    } else {
      status = 500;
      _err = {
        err_code: err.code || 0,
        message: 'INTERNAL ERROR'
      };
    }
    res.status(status).json({
      code: 0,
      err: _err
    });
  }

  /**
   * 取得请求的参数
   * @param {*} req
   */
  getParameters(req) {
    // logger.info(req.query);
    console.log(req.query);
    return Object.assign(req.query, req.body, req.params);
  }

}

module.exports = BaseController;
