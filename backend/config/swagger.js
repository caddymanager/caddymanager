const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Caddy Manager API',
      version: '0.0.1',
      description: 'API documentation for Caddy Manager application',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        email: 'support@caddymanager.example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: '{protocol}://{host}:{port}/api/v1',
        description: 'Custom server',
        variables: {
          protocol: {
            enum: ['http', 'https'],
            default: 'http',
          },
          host: {
            default: 'localhost',
          },
          port: {
            default: '3000',
          },
        },
      },
    ],
    components: {
      schemas: {
        CaddyServer: {
          type: 'object',
          required: ['name', 'apiUrl'],
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB generated ID',
              example: '60d21b4667d0d8992e610c85',
            },
            name: {
              type: 'string',
              description: 'Server name',
              example: 'Production Caddy',
            },
            apiUrl: {
              type: 'string',
              description: 'API URL of the Caddy server',
              example: 'http://caddy-server.example.com',
            },
            apiPort: {
              type: 'number',
              description: 'API port number',
              example: 2019,
            },
            adminApiPath: {
              type: 'string',
              description: 'Admin API path',
              example: '/config/',
            },
            active: {
              type: 'boolean',
              description: 'Is the server active',
              example: true,
            },
            status: {
              type: 'string',
              enum: ['online', 'offline', 'unknown'],
              example: 'online',
            },
            lastPinged: {
              type: 'string',
              format: 'date-time',
              example: '2025-04-20T12:00:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-04-19T09:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-04-20T10:30:00Z',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            error: {
              type: 'string',
              example: 'Detailed error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '60d21b4667d0d8992e610c85'
            },
            username: {
              type: 'string',
              description: 'Username',
              example: 'johndoe'
            },
            email: {
              type: 'string',
              description: 'Email address',
              example: 'john.doe@example.com'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
              example: 'user'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user is active',
              example: true
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp',
              example: '2025-04-25T14:30:00Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2025-04-20T10:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2025-04-25T14:30:00Z'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              example: 'john.doe@example.com'
            },
            password: {
              type: 'string',
              example: 'MySecurePassword123!'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              example: 'johndoe'
            },
            email: {
              type: 'string',
              example: 'john.doe@example.com'
            },
            password: {
              type: 'string',
              example: 'MySecurePassword123!'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        }
      },
    },
  },
  apis: [
    './router/*.js',
    './controllers/*.js',
    './app.js',
    './services/*.js',
    './models/*.js'
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;