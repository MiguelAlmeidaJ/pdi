module.exports = {
  apps: [
    {
      name: 'pdi-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production', PORT: 3001 },
    },
    {
      name: 'pdi-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
    },
  ],
};
