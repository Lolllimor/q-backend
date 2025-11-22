module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': [
            "'self'",
            'https:',
            '*.amazonaws.com',
            '*.s3.amazonaws.com',
            env('APP_URL'),
          ],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'klap-strapi-assets.s3.us-west-2.amazonaws.com',
            '*.s3.amazonaws.com',
            '*.s3.*.amazonaws.com',
            env('APP_URL'),
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'klap-strapi-assets.s3.us-west-2.amazonaws.com',
            '*.s3.amazonaws.com',
            '*.s3.*.amazonaws.com',
            env('APP_URL'),
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: ['http://localhost:3000', 'http://localhost:1337'],
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
