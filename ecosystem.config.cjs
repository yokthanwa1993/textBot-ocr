module.exports = {
  apps: [
    {
      name: 'textbot-ocr',
      script: 'server.js',
      env_file: '.env',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        GOOGLE_CLOUD_API_KEY: 'AIzaSyDmYImXkmWktZolstbe8ft8GYnjdLMAxdM',
        GOOGLE_CLOUD_PROJECT_ID: 'receive-message-from-line-api'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        GOOGLE_CLOUD_API_KEY: 'AIzaSyDmYImXkmWktZolstbe8ft8GYnjdLMAxdM',
        GOOGLE_CLOUD_PROJECT_ID: 'receive-message-from-line-api'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/ocr-error.log',
      out_file: './logs/ocr-out.log',
      log_file: './logs/ocr-combined.log',
      time: true
    }
  ]
};
