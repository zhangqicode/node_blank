
class Observer {
  async update(observable, ...args) {
    throw new AbstractMethodError(`${this.constructor.name}`);
  }
}

module.exports = Observer;
