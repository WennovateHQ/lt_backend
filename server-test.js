const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Mock data
const mockUsers = [
  { id: '1', email: 'admin@localtalents.ca', userType: 'ADMIN', firstName: 'Admin', lastName: 'User' },
  { id: '2', email: 'business1@example.com', userType: 'BUSINESS', firstName: 'Business', lastName: 'User' },
  { id: '3', email: 'talent1@example.com', userType: 'TALENT', firstName: 'Talent', lastName: 'User' }
];

const mockSkills = [
  { id: '1', name: 'JavaScript', category: 'Programming' },
  { id: '2', name: 'React', category: 'Frontend' },
  { id: '3', name: 'Node.js', category: 'Backend' }
];

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'LocalTalents API is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'LocalTalents API - Test Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      skills: '/api/skills',
      projects: '/api/projects'
    }
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = mockUsers.find(u => u.email === email);
  if (user && password) {
    res.json({
      user,
      token: 'mock-jwt-token-for-testing-' + user.id,
      message: 'Login successful'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Users endpoints
app.get('/api/users', (req, res) => {
  res.json(mockUsers);
});

app.get('/api/users/:id/profile', (req, res) => {
  const user = mockUsers.find(u => u.id === req.params.id);
  if (user) {
    res.json({
      ...user,
      profile: {
        bio: 'Test user profile',
        skills: ['JavaScript', 'React'],
        location: 'Toronto, ON'
      }
    });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Skills endpoints
app.get('/api/skills', (req, res) => {
  res.json(mockSkills);
});

// Projects endpoints
app.get('/api/projects', (req, res) => {
  res.json([
    { id: '1', title: 'E-commerce Website', description: 'Build a modern e-commerce platform', status: 'PUBLISHED' },
    { id: '2', title: 'Mobile App Development', description: 'Create a React Native mobile app', status: 'PUBLISHED' }
  ]);
});

// Applications endpoints
app.get('/api/applications', (req, res) => {
  res.json([
    { id: '1', projectId: '1', talentId: '3', status: 'pending', coverLetter: 'I am interested in this project' }
  ]);
});

// Admin endpoints
app.get('/api/admin/stats', (req, res) => {
  res.json({
    totalUsers: mockUsers.length,
    totalTalents: mockUsers.filter(u => u.userType === 'TALENT').length,
    totalBusinesses: mockUsers.filter(u => u.userType === 'BUSINESS').length,
    totalProjects: 2,
    totalApplications: 1
  });
});

app.get('/api/admin/test-email', (req, res) => {
  res.json({
    connected: true,
    message: 'SMTP connection successful (mock)',
    timestamp: new Date().toISOString()
  });
});

// Matching endpoints
app.get('/api/matching/talents', (req, res) => {
  res.json(mockUsers.filter(u => u.userType === 'TALENT'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LocalTalents Test API Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login API: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
  console.log('✅ Ready for frontend integration testing!');
});
