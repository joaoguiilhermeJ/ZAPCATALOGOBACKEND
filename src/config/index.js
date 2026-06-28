import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Suporta múltiplas origens separadas por vírgula no CORS_ORIGIN
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : (isProduction ? [] : ['http://localhost:3000']);

// Se FRONTEND_URL for definida, adiciona automaticamente
if (process.env.FRONTEND_URL && !corsOrigins.includes(process.env.FRONTEND_URL)) {
  corsOrigins.push(process.env.FRONTEND_URL);
}

// Em produção sem CORS configurado, reflete a origem (seguro para MVP)
const corsOrigin = corsOrigins.length > 0
  ? corsOrigins
  : true; // true = reflete a origem da requisicao (equivalente a permitir qualquer origem)

export default {
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || 'development',
  cors: {
    origin: corsOrigin,
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