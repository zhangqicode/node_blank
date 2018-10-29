
class Observable {
  constructor(type) {
    if (new.target === Observable) { // 定义为抽象类，不能被实例化
      throw new AbstractMethodError(`Abstract Class: ${Observable.name}`);
    }
    this.observers = new Map();
    this.data = [];
    this.type = type;
  }

  attach(observer) {
    this.observers.set(observer, null);
    return this;
  }

  detach(observer) {
    this.observers.delete(observer);
    return this;
  }

  change(...data) {
    this.data = data;
    return this;
  }

  notify() {
    for (const [observer] of this.observers) {
      observer.update(this, ...this.data);
    }
    this.data = [];
  }
}

module.exports = Observable;
