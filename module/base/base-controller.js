const Limiter = require('ratelimiter');
const ipip = require('ip');
const Aliyun = require('../../util/aliyun');
const AuthService = require('../auth/auth-service');
const RedisManger = require('../../system/redis-manager');
const DingXiang = require('../../util/dingxiang');
const UserService = require('../user/user-service');
const isWX = require('../../util/is-wx');
const passportService = require('../passport/passport-service');

const redisClient = RedisManger.getMsgClient();

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
   * 返回成功的请求 for cms
   * @param {*} res
   * @param {*} data
   */
  successForCmsTable(res, rows, total) {
    res.json({
      code: 1,
      rows,
      total
    });
  }

  /**
   * 返回失败的请求
   * @param {*} res
   * @param {*} err
   */
  failure(res, err) {
    logger.error({ err }, 'request error!');
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
    logger.info(req.query);
    return Object.assign(req.query, req.body, req.params);
  }

  /**
   * 整理 cms table list 入参
   * @param {*} req
   */
  getParametersForCmsTable(req) {
    const { sort, order, offset, limit, search } = this.getParameters(req);

    const params = {
      orders: [[sort || 'id', order || 'DESC']],
      offset: offset || 0,
      limit: limit || 25,
      search
    };

    return params;
  }

  /**
   * 取得请求的ip地址
   * @param {*} req
   */
  getIp(req) {
    return (req.headers['x-forwarded-for'] ||
      req.headers['CF-Connecting-IP'] ||
      req.headers['True-Client-IP'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress).split(',')[0];
  }

  async _wechatLogin(req, res) {
    let access_token = req.headers['x-access-token'];

    const openid = process.env.NODE_ENV === 'production' ? req.cookies['_openid'] : req.cookies['_openid_tst'];
    const user = await UserService.findUserByOpenId(openid);
    const is_bind = !!user;
    const params = {
      ip: this.getIp(req),
      fr: 'wechat',
      country_code: user.country
    };
    const genToken = async (user, params) => { // eslint-disable-line
      const wechat_access_token = await passportService.autoLoginUser(user, params);
      res.cookie('_candy_token', wechat_access_token, { httpOnly: false, domain: '.candy.one' });
      return wechat_access_token;
    };

    if (!is_bind) { // 未曾绑定过 wechat
      await UserService.bindWechat({ user, openid });
      access_token = genToken(user, params);
    }

    if (!access_token) { // 绑定过但 cookie 中未存有 token
      access_token = genToken(user, params);
    }

    // 绑定过，且有 token，但 token 解析出错
    try {
      const verifyResult = await AuthService.verifyAccessToken(access_token);
      if (!verifyResult.result) {
        access_token = genToken(user, params);
      }
    } catch (err) {
      access_token = genToken(user, params);
    }

    return access_token;
  }

  /**
   * 验证登录状态
   * @param {*} req
   * @param {*} res
   * @param {*} next
   */
  async needLogin(req, res, next) {
    const is_wx = isWX(req);
    // 临时日志
    logger.error({ ip: this.getIp(req), method: req.method, url: req.url, baseUrl: req.baseUrl }, 'request needLogin');

    let access_token = req.headers['x-access-token'];

    if (is_wx) {
      access_token = await this._wechatLogin(req, res);
    }

    if (!access_token) {
      return this.failure(res, new LoginError('请登录', 10007));
    }

    try {
      const verifyResult = await AuthService.verifyAccessToken(access_token);
      if (verifyResult.result) {
        const { info } = verifyResult;
        req.user = { id: info.id, phone: info.phone };
        return next();
      }
      return this.failure(res, new LoginError('请重新登录', 10008));
    } catch (err) {
      return this.failure(res, new LoginError('请重新登录', 10008));
    }
  }

  /**
   * 获取用户信息
   * @param {*} req
   * @param {*} res
   * @param {*} next
   */
  async parseUser(req, res, next) {
    const access_token = req.headers['x-access-token'];

    if (!access_token) {
      return next();
    }

    try {
      const verifyResult = await AuthService.verifyAccessToken(access_token);
      if (verifyResult.result) {
        const { info } = verifyResult;
        req.user = { id: info.id, phone: info.phone };
        return next();
      }
      return this.failure(res, new LoginError('请重新登录', 10008));
    } catch (err) {
      return this.failure(res, new LoginError('请重新登录', 10008));
    }
  }

  async isRateLimitReached(req, country_code, phone) {
    const ip = this.getIp(req);
    const key = `recaptcha:${ip}:${country_code}${phone}`;
    const limit = new Limiter({
      id: key,
      db: redisClient,
      max: 2,
      duration: 30000 // 30 seconds
    });

    return new Promise((resolve) => {
      limit.get((err, lmt) => {
        if (err) {
          return resolve(true);
        }
        return resolve(lmt.remaining === 0);
      });
    });
  }

  async isRateLimitReachedByIp(req, max, duration) {
    const ip = this.getIp(req);
    const key = `recaptcha:${ip}`;
    const limit = new Limiter({
      id: key,
      db: redisClient,
      max: max || 2,
      duration: duration || 30000 // 30 seconds
    });

    return new Promise((resolve) => {
      limit.get((err, lmt) => {
        if (err) {
          return resolve(true);
        }
        return resolve(lmt.remaining === 0);
      });
    });
  }

  async aliyunAfsCheck(req, res, next) {
    const { platform, session, sig, token, scene, phone, country_code } = this.getParameters(req);
    // Wait to conditionally check Google recaptcha
    // if (!platform) {
    //   return next();
    // }

    const isLimitReached = await this.isRateLimitReached(req, country_code, phone);
    if (isLimitReached) {
      return this.failure(res, new BusinessError('请稍候重试', 10000));
    }

    try {
      const result = await Aliyun.afsCheck(platform, session, sig, token, scene);
      if (result.Data) {
        return next();
      }
      return this.failure(res, new BusinessError('二次验证验证码错误', 10003));
    } catch (e) {
      return this.failure(res, e);
    }
  }

  ipLimit(ips) {
    return (req, res, next) => {
      const ip = this.getIp(req);

      if (ipip.isPrivate(ip) || ['127.0.0.1', '::1', '::0:1', '::ffff:127.0.0.1'].indexOf(ip) > -1) {
        return next();
      }

      ips = [].concat(ips);
      if (ips.length === 0) {
        return next();
      }

      for (const item of ips) {
        if (item === '*') {
          return next();
        }

        if (item.indexOf('/') > -1 && ip.cidrSubnet(item).contains(ip)) {
          return next();
        }

        if (item === ip) {
          return next();
        }
      }

      return this.failure(res, new LoginError('没有权限', 10009));
    };
  }

  needLoginOrIpLimit(ips) {
    return async (req, res, next) => {
      const access_token = req.headers['x-access-token'];
      if (access_token) {
        try {
          const verifyResult = await AuthService.verifyAccessToken(access_token);
          if (verifyResult.result) {
            const { info } = verifyResult;
            req.user = { id: info.id };
          }
          return next();
        } catch (err) {
          return next();
        }
      } else {
        this.ipLimit(ips)(req, res, next);
      }
    };
  }

  async dingxiangVerify(req, res, next) {
    const { token, phone, country_code } = this.getParameters(req);
    try {
      const isLimitReached = await this.isRateLimitReached(req, country_code, phone);
      if (isLimitReached) {
        return this.failure(res, new BusinessError('请稍候重试', 10000));
      }
      const result = await DingXiang.verify(token);
      if (result) {
        return next();
      }
      return this.failure(res, new BusinessError('验证失败', 10005));
    } catch (e) {
      logger.error(token, e);
      return this.failure(res, e);
    }
  }

  async need2Fa(req, res, next) {
    const { id: user_id } = req.user;
    const token = req.headers['x-2fa-token'];
    const { bind, result } = await AuthService.verify2Fa(user_id, token);
    if (!bind) {
      return this.failure(res, new BusinessError('请先绑定2fa', 280001));
    }
    if (!result) {
      return this.failure(res, new BusinessError('二步验证错误', 280002));
    }
    return next();
  }
}

module.exports = BaseController;
