const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Basic error logger
app.use((req, res, next) => {
    console.log('Request:', {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body
    });
    next();
});

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Hello from Nikhaar Beauty Salon API' });
});

// Health check
app.get('/api/health', (_, res) => {
    res.json({ status: 'healthy' });
});

// Test route
app.get('/api/test', (_, res) => {
    res.json({ 
        message: 'Test endpoint',
        env: process.env.NODE_ENV
    });
});

// Favicon
app.get('/favicon.ico', (_, res) => {
    res.status(204).end();
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        path: req.path 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Server Error' });
});

// Export the Express app
module.exports = app;

// Local development server
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 5001;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}