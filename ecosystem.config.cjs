const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'trilha-api',
      cwd: root,
      script: path.join(root, 'apps/api/dist/main.js'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'trilha-web',
      cwd: path.join(root, 'apps/web'),
      script: path.join(root, 'apps/web/node_modules/next/dist/bin/next'),
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
