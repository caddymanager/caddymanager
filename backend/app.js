const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { connectToMongo } = require('./services/mongoService');
const pingService = require('./services/pingService');
const routes = require('./router');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectToMongo();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb', type: 'text/plain' })); // Add text parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Swagger API Documentation UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, { explorer: true }));

// Expose the Swagger JSON schema for frontend consumption
app.get('/api/v1/docs/swagger.json', (req, res) => {
  res.json(swaggerSpecs);
});

// Mount routes
app.use('/', routes);

// Start the ping service
const pingServiceStatus = pingService.startPingService();
console.log(`Ping service initialized: ${JSON.stringify(pingServiceStatus)}`);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Catch 404 and forward to error handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Caddy Manager API server listening on port ${PORT}`);
  console.log(`Ping service is running: ${pingService.getPingServiceStatus().running}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  pingService.stopPingService();
  console.log('Ping service stopped');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

module.exports = app;