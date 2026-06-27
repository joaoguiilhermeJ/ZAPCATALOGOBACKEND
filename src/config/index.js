import dotenv from 'dotenv';

dotenv.config();

// Suporta múltiplas origens separadas por vírgula no CORS_ORIGIN
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:3000'];

// Em produção (Render), permite qualquer origem do frontend
// O CORS_ORIGIN deve conter a URL do frontend (ex: https://zapcatalogo.vercel.app)
// Se FRONTEND_URL for definida, ela é automaticamente adicionada às origens permitidas
if (process.env.FRONTEND_URL && !corsOrigins.includes(process.env.FRONTEND_URL)) {
  corsOrigins.push(process.env.FRONTEND_URL);
}

export default {
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || 'development',
  cors: {
    origin: corsOrigins,
  },
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    allowedTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '.xlsx',
      '.xls',
    ],
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'zapcatalogo-dev-fallback-secret-key',
  },
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
};