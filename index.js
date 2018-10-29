const InitManager = require('./system/init-manager');

const main = async () => {
  await InitManager.start();
  await require('./server').start();
}

main();