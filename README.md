# LocalTalents.ca Backend API

A Node.js/Express backend API for the LocalTalents.ca marketplace platform, connecting local businesses with technical talent.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with Auth0 integration and role-based access
- **User Management**: Business and talent user profiles with skills, location, and completion tracking
- **Project Management**: Create, publish, and manage projects with advanced search and filtering
- **Application System**: Complete application lifecycle with status tracking and notifications
- **Intelligent Matching**: AI-powered talent-project matching with weighted scoring algorithm
- **Payment Processing**: Full Stripe Connect integration with milestone-based payments
- **Skills System**: Comprehensive skill management with categories, levels, and trending analysis
- **Rate Limiting**: Redis-backed rate limiting with different limits per operation type
- **File Uploads**: Avatar and document upload support with Azure Blob Storage
- **Database**: PostgreSQL with Prisma ORM and optimized queries
- **Caching**: Redis for session management, rate limiting, and performance optimization
- **Security**: Helmet, CORS, input validation, audit logging, and comprehensive error handling
- **Logging**: Structured logging with Winston and security event tracking
- **Health Checks**: Database, Redis, and system health monitoring

## 🛠 Tech Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.x
- **Language**: TypeScript
- **Database**: PostgreSQL 15 (Azure Database)
- **ORM**: Prisma
- **Cache**: Redis 7.x (Azure Cache for Redis)
- **Authentication**: JWT + Auth0
- **Payments**: Stripe Connect
- **Validation**: Zod
- **File Upload**: Multer + Azure Blob Storage
- **Logging**: Winston
- **Security**: Helmet, bcryptjs, rate limiting

## 📁 Project Structure

```
src/
├── config/
│   ├── database.ts          # Prisma database configuration
│   ├── redis.ts             # Redis connection and cache service
│   ├── logger.ts            # Winston logging configuration
│   └── env.ts               # Environment validation with Zod
├── shared/
│   ├── middleware/
│   │   ├── auth.ts          # Authentication & authorization
│   │   ├── rate-limiter.ts  # Rate limiting middleware
│   │   └── error-handler.ts # Global error handling
│   └── utils/
│       └── app-error.ts     # Custom error classes
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts  # Authentication business logic
│   │   ├── auth.controller.ts
│   │   └── auth.routes.ts
│   ├── users/
│   │   ├── users.service.ts # User profile management
│   │   ├── users.controller.ts
│   │   └── users.routes.ts
│   ├── skills/
│   │   ├── skills.service.ts # Skills management
│   │   ├── skills.controller.ts
│   │   └── skills.routes.ts
│   ├── projects/
│   │   ├── projects.service.ts # Project management
│   │   ├── projects.controller.ts
│   │   └── projects.routes.ts
│   ├── applications/
│   │   ├── applications.service.ts # Application management
│   │   ├── applications.controller.ts
│   │   └── applications.routes.ts
│   ├── matching/
│   │   ├── matching.service.ts # Intelligent talent-project matching
│   │   ├── matching.controller.ts
│   │   └── matching.routes.ts
│   └── payments/
│       ├── payments.service.ts # Stripe payment processing
│       ├── payments.controller.ts
│       └── payments.routes.ts
├── prisma/
│   └── schema.prisma        # Database schema
└── server.ts                # Express app setup
```

## 🔧 Setup & Installation

### Prerequisites

- Node.js 20 LTS
- PostgreSQL 15+
- Redis 7+
- Azure account (for production deployment)

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://username:password@server.postgres.database.azure.com:5432/localtalents_dev?sslmode=require"

# Redis
AZURE_REDIS_HOST=your-redis-host
AZURE_REDIS_PORT=6380
AZURE_REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email
SENDGRID_API_KEY=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@localtalents.ca
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

## 📚 API Documentation

### Authentication Endpoints

```
POST /api/auth/register     # Register new user
POST /api/auth/login        # Login user
POST /api/auth/logout       # Logout user
POST /api/auth/refresh      # Refresh tokens
POST /api/auth/verify-email # Verify email address
POST /api/auth/forgot-password # Request password reset
POST /api/auth/reset-password  # Reset password
GET  /api/auth/profile      # Get current user profile
```

### User Management

```
GET    /api/users/profile           # Get current user profile
PUT    /api/users/profile           # Update profile
PUT    /api/users/location          # Update location
GET    /api/users/profile/completion # Check profile completion
GET    /api/users/dashboard         # Get dashboard data
POST   /api/users/skills            # Add skill to profile
PUT    /api/users/skills/:skillId   # Update skill level
DELETE /api/users/skills/:skillId   # Remove skill
POST   /api/users/avatar            # Upload avatar
DELETE /api/users/avatar            # Delete avatar
GET    /api/users/search            # Search users
GET    /api/users/:userId/public    # Get public profile
GET    /api/users/stats             # Get user statistics (admin)
```

### Skills Management

```
GET    /api/skills                    # Get all skills
GET    /api/skills/categories         # Get skill categories
GET    /api/skills/search             # Search skills (autocomplete)
GET    /api/skills/popular            # Get popular skills
GET    /api/skills/trending           # Get trending skills
GET    /api/skills/:skillId           # Get skill by ID
POST   /api/skills                    # Create skill (admin)
PUT    /api/skills/:skillId           # Update skill (admin)
DELETE /api/skills/:skillId           # Delete skill (admin)
GET    /api/skills/admin/stats        # Get skill statistics (admin)
POST   /api/skills/admin/bulk-import  # Bulk import skills (admin)
```

### Project Management

```
GET    /api/projects/search                # Search projects
GET    /api/projects/my/projects           # Get my projects (business)
GET    /api/projects/recommended/for-me    # Get recommended projects (talent)
GET    /api/projects/business/:businessId  # Get projects by business (public)
GET    /api/projects/:projectId            # Get project by ID
POST   /api/projects                       # Create project (business)
PUT    /api/projects/:projectId            # Update project (business)
PATCH  /api/projects/:projectId/status     # Update project status
DELETE /api/projects/:projectId            # Delete project (business)
POST   /api/projects/:projectId/publish    # Publish project
POST   /api/projects/:projectId/cancel     # Cancel project
POST   /api/projects/:projectId/complete   # Complete project
GET    /api/projects/admin/stats           # Get project statistics (admin)
```

### Application Management

```
POST   /api/applications                        # Create application (talent)
GET    /api/applications/my/applications        # Get my applications (talent)
GET    /api/applications/project/:projectId     # Get project applications (business)
GET    /api/applications/:applicationId         # Get application by ID
PUT    /api/applications/:applicationId         # Update application (talent)
PATCH  /api/applications/:applicationId/status  # Update application status (business)
POST   /api/applications/:applicationId/accept  # Accept application (business)
POST   /api/applications/:applicationId/reject  # Reject application (business)
POST   /api/applications/:applicationId/withdraw # Withdraw application (talent)
GET    /api/applications/project/:projectId/can-apply # Check if can apply (talent)
GET    /api/applications/admin/stats            # Get application statistics (admin)
```

### Intelligent Matching

```
GET    /api/matching/project/:projectId/talent           # Find talent for project (business)
GET    /api/matching/talent/projects                     # Find projects for talent (talent)
GET    /api/matching/project/:projectId/talent/:talentId/explain # Explain match score
GET    /api/matching/admin/stats                         # Get matching statistics (admin)
```

### Payment Processing

```
POST   /api/payments/connect/account                     # Create Stripe Connect account (talent)
GET    /api/payments/connect/status                      # Get Connect account status (talent)
POST   /api/payments/connect/account/:accountId/link     # Create account link (talent)
POST   /api/payments/intent                              # Create payment intent (business)
GET    /api/payments/my/payments                         # Get payment history
GET    /api/payments/contract/:contractId                # Get contract payments
GET    /api/payments/:paymentId                          # Get payment by ID
GET    /api/payments/my/payment-methods                  # Get payment methods
GET    /api/payments/calculate-fees                      # Calculate payment fees
POST   /api/payments/webhook/stripe                      # Stripe webhook handler
GET    /api/payments/admin/stats                         # Get payment statistics (admin)
```

### Contract Management

```
POST   /api/contracts                                    # Create contract (business)
GET    /api/contracts/my/contracts                       # Get my contracts
GET    /api/contracts/stats                              # Get contract statistics
GET    /api/contracts/:contractId                        # Get contract by ID
PUT    /api/contracts/:contractId                        # Update contract (business)
POST   /api/contracts/:contractId/sign                   # Sign contract
POST   /api/contracts/:contractId/milestones             # Create milestone (business)
PUT    /api/contracts/milestones/:milestoneId            # Update milestone (business)
POST   /api/contracts/milestones/:milestoneId/submit     # Submit milestone (talent)
POST   /api/contracts/milestones/:milestoneId/approve    # Approve milestone (business)
```

### Messaging System

```
POST   /api/messages                                     # Send message
GET    /api/messages/conversations                       # Get conversations
GET    /api/messages/my/messages                         # Get my messages
GET    /api/messages/stats                               # Get message statistics
GET    /api/messages/search                              # Search messages
GET    /api/messages/conversation/:userId                # Get conversation with user
GET    /api/messages/:messageId                          # Get message by ID
PATCH  /api/messages/:messageId/read                     # Mark message as read
DELETE /api/messages/:messageId                          # Delete message
```

### Review System

```
POST   /api/reviews                                      # Create review
GET    /api/reviews/my/reviews                           # Get my reviews (given/received)
GET    /api/reviews/my/pending                           # Get pending reviews
GET    /api/reviews/user/:userId                         # Get user reviews (public)
GET    /api/reviews/user/:userId/summary                 # Get user rating summary
GET    /api/reviews/:reviewId                            # Get review by ID
PUT    /api/reviews/:reviewId                            # Update review
POST   /api/reviews/:reviewId/respond                    # Respond to review
POST   /api/reviews/:reviewId/flag                       # Flag review
```

### Notifications

```
GET    /api/notifications/my/notifications               # Get my notifications
GET    /api/notifications/stats                          # Get notification statistics
PATCH  /api/notifications/mark-all-read                  # Mark all as read
GET    /api/notifications/:notificationId                # Get notification by ID
PATCH  /api/notifications/:notificationId/read           # Mark notification as read
DELETE /api/notifications/:notificationId                # Delete notification
```

## 🔐 Authentication Flow

The API uses JWT tokens with the following flow:

1. **Registration/Login**: User provides credentials
2. **Token Generation**: Server returns access token (15min) and refresh token (7 days)
3. **API Requests**: Include `Authorization: Bearer <token>` header
4. **Token Refresh**: Use refresh token to get new access token
5. **Logout**: Invalidate tokens on server

### User Types & Permissions

- **BUSINESS**: Can create projects, view applications, manage contracts
- **TALENT**: Can apply to projects, manage profile, view opportunities
- **ADMIN**: Full system access, user management, content moderation

## 🛡️ Security Features

- **Rate Limiting**: Different limits for auth, API, uploads, etc.
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: Helmet middleware
- **CORS**: Configurable cross-origin resource sharing
- **Password Hashing**: bcrypt with salt rounds
- **JWT Security**: Short-lived access tokens, rotating refresh tokens
- **Error Handling**: No sensitive data in error responses

## 📊 Database Schema

Key entities:
- **Users**: Authentication and basic info
- **Profiles**: Detailed user information with location
- **Skills**: Skill definitions and categories
- **UserSkills**: User skill associations with levels and experience
- **Projects**: Project postings with requirements and budget
- **ProjectSkills**: Required skills for projects with levels
- **Applications**: Talent applications to projects with proposals
- **Contracts**: Agreements between businesses and talent
- **Milestones**: Project milestones for payment tracking
- **Payments**: Payment processing with Stripe integration
- **Messages**: Communication between users
- **Reviews**: Feedback system for completed work
- **Locations**: Geographic data for local matching

## 🚀 Deployment

### Azure App Service

1. **Build**: `npm run build`
2. **Deploy**: Push to Azure App Service
3. **Environment**: Set production environment variables
4. **Database**: Configure Azure Database for PostgreSQL
5. **Redis**: Configure Azure Cache for Redis
6. **Monitoring**: Enable Application Insights

### Health Checks

The API includes comprehensive health checks at `/health`:
- Database connectivity
- Redis connectivity  
- Memory usage
- Service status

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

## 📝 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting
- Write descriptive commit messages

### Error Handling
- Use custom AppError class
- Provide meaningful error messages
- Log errors with context
- Don't expose sensitive information

### Database
- Use Prisma migrations for schema changes
- Include proper indexes for performance
- Use transactions for multi-step operations
- Validate data at application level

### Security
- Validate all inputs with Zod
- Use rate limiting appropriately
- Log security events
- Follow principle of least privilege

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

## 🎯 MVP Status

**✅ Complete MVP Implementation**
- ✅ Authentication & User Management
- ✅ Project Creation & Management  
- ✅ Application System
- ✅ Intelligent Matching Algorithm
- ✅ Stripe Payment Processing
- ✅ Skills Management System
- ✅ Rate Limiting & Security
- ✅ Comprehensive API Documentation

**🚀 Ready for Production Deployment**

---

Built with ❤️ for the LocalTalents.ca platform
