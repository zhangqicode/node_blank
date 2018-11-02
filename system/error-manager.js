
/**
 *
 */
class LouckyError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 业务异常定义
 */
class BusinessError extends LouckyError {
  constructor(message, code) {
    super(message, code);
  }
}


/**
 * 登录异常定义
 */
class LoginError extends LouckyError {
  constructor(message, code) {
    super(message, code);
  }
}

/**
 * 抽象方法异常定义
 */
class AbstractMethodError extends LouckyError {
  constructor(message) {
    super(message, 'Abstract Method');
  }
}

module.exports = {
  BusinessError,
  LoginError,
  AbstractMethodError
};
