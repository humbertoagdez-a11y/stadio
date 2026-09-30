// Configuración de PM2 (alternativa a Docker).
// Uso:  pm2 start ecosystem.config.cjs && pm2 save
// IMPORTANTE: 1 sola instancia. SQLite + varias instancias en cluster
// funciona, pero el rate-limit en memoria dejaría de ser exacto.
module.exports = {
  apps: [
    {
      name: 'heist-runner',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      time: true,
    },
  ],
};
