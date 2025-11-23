export default ({ env }) => [
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
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeadersOnError: true,
    },
  },

  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '256mb', // Increase form data limit
      jsonLimit: '256mb', // Increase JSON payload limit
      textLimit: '256mb', // Increase text payload limit
      formidable: {
        maxFileSize: 200 * 1024 * 1024, // 200MB max file size
        maxFieldsSize: 200 * 1024 * 1024, // 200MB max fields size
        maxTotalFileSize: 200 * 1024 * 1024, // 200MB total files size
        allowEmptyFiles: false,
        minFileSize: 1, // 1 byte minimum
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
