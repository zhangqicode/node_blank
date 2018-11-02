function buildApiResponse(data, err) {
  let errMessage = err || null;
  if (errMessage && typeof errMessage === 'object' && errMessage.message) {
    errMessage = errMessage.message;
  }
  return {
    err: errMessage,
    data: typeof data === 'boolean' ? data : (data || null)
  };
}

class HttpUtil {
  responseBase(req, res, data, err, status) {
    const result = buildApiResponse(data, err);
    return status !== undefined ? res.status(status).json(result) : res.json(result);
  }
  success(req, res, data, status) {
    return this.responseBase(req, res, data, null, status);
  }
  error(req, res, err, status) {
    return this.responseBase(req, res, null, err, status);
  }
}


module.exports = new HttpUtil();
