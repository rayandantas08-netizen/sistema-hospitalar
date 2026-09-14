// Vercel serverless entry point
// Vercel procura por /api/index.js automaticamente
const app = require('../dist/app.js').default || require('../dist/app.js');

module.exports = app;
