class requestHelper {

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

}

module.exports = new requestHelper();