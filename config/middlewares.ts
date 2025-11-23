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
        'Origin',
        'Accept',
        'Access-Control-Allow-Headers',
      ],
      credentials: false,
      keepHeaderOnError: true, 
      preflightContinue: false, 
      optionsSuccessStatus: 204, 
    },
  },

  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
