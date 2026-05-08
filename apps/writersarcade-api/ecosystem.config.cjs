module.exports = {
  apps: [
    {
      name: 'writersarcade-api',
      cwd: '/opt/writersarcade/apps/writersarcade-api',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3800,
      },
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/writersarcade/apps/writersarcade-api/logs/error.log',
      out_file: '/opt/writersarcade/apps/writersarcade-api/logs/out.log',
      merge_logs: true,
    },
  ],
}
