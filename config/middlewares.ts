export default [
  'strapi::logger',
  'strapi::errors',

  // SECURITY — CSP disabled for now
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
    },
  },

  // CORS
  {
    name: 'strapi::cors',
    config: {
      origin: ['http://localhost:3000', 'https://your-production-frontend.com'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: [
        'Content-Type',
        'Authorization',
        'X-Frame-Options',
        'Origin',
        'Accept',
        'X-Requested-With',
        'Access-Control-Allow-Headers',
        'Strapi-Transformer-Ignore',
        'strapi-response-format',
      ],
      credentials: true,
      keepHeaderOnError: true, // Ensure CORS headers are sent even on error responses
      preflightContinue: false, // Ensure preflight requests are handled by Strapi
      optionsSuccessStatus: 204, // Return 204 for OPTIONS requests
    },
  },

  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
