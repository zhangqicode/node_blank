const DemoController = require('./demo-controller');

module.exports.basePath = '/demo';
module.exports._this = DemoController;

module.exports.routes = [
  {
    method: 'post',
    path: '/add',
    summary: '添加demo',
    description: '',
    action: [DemoController.addDemo]
  },
  {
    method: 'post',
    path: '/delete',
    summary: '删除demo',
    description: '',
    action: [DemoController.deleteDemo]
  },
  {
    method: 'post',
    path: '/update',
    summary: '修改demo',
    description: '只能修改 status',
    action: [DemoController.updateDemo]
  },
  {
    method: 'get',
    path: '/search',
    summary: '查找demo',
    description: '',
    action: [DemoController.searchDemo]
  },
  {
    method: 'get',
    path: '/alldemos',
    summary: '获取所有demo',
    description: '',
    action: [DemoController.getAllDemos]
  }
];
