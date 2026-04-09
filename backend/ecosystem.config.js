module.exports = {
  apps: [
    // ── Backend API (Express) ──────────────────────────────────────────────────
    {
      name: 'hr-backend',
      script: 'dist/index.js',
      cwd: '/root/ayg-hr-automation/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // ── Frontend (Vue SPA — served as static files) ────────────────────────────
    // pm2 serve handles SPA routing: all unknown paths → index.html
    {
      name: 'hr-frontend',
      script: 'serve',
      args: '-s dist -l 3000',
      cwd: '/root/ayg-hr-automation/frontend',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '128M',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
