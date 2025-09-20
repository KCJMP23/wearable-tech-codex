# Secure Escrow System for Site Marketplace

A comprehensive, production-ready escrow system built with Stripe Connect for secure multi-party payments in the site marketplace. This system provides secure fund holding, milestone-based releases, dispute resolution, and encrypted document storage.

## 🏗️ Architecture Overview

The escrow system is built with a modular architecture focusing on security, reliability, and compliance:

```
┌─────────────────────────────────────────────────────────────┐
│                    Escrow System                            │
├─────────────────────────────────────────────────────────────┤
│  API Layer (route.ts)                                      │
│  ├── Authentication & Authorization                        │
│  ├── Request Validation (Zod schemas)                      │
│  ├── Error Handling & Audit Logging                       │
│  └── Response Formatting                                   │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                      │
│  ├── Stripe Connect Integration                           │
│  ├── Payment Splitter (Multi-party)                      │
│  ├── Milestone Tracker                                    │
│  ├── Dispute Handler                                      │
│  ├── Document Vault (Encrypted)                          │
│  └── Transfer Automation                                  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                               │
│  ├── Supabase PostgreSQL                                 │
│  ├── Row Level Security (RLS)                            │
│  ├── Audit Logging                                       │
│  └── Encrypted Document Storage                          │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                    │
│  ├── Stripe Connect (Payments)                           │
│  ├── Stripe Webhooks                                     │
│  └── Supabase Storage (Documents)                        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Features

### Core Escrow Functionality
- **Multi-party Payment Processing**: Secure fund holding with automatic platform fee calculation
- **Milestone-based Fund Releases**: Customizable milestones with approval workflows
- **Automated Transfer Processing**: Smart fund releases based on conditions and timeouts
- **Comprehensive Audit Trail**: Every action is logged with full context

### Security & Compliance
- **PCI DSS Compliance**: All payment data handled by Stripe
- **Encrypted Document Storage**: AES-256 encryption for sensitive documents
- **Row Level Security**: Database-level access controls
- **Comprehensive Error Handling**: Secure error responses without data leakage
- **Security Event Monitoring**: Real-time fraud and security threat detection

### Dispute Resolution
- **Multi-level Dispute System**: Open disputes, investigations, and arbitration
- **Evidence Management**: Secure document and communication trails
- **Automated Escalation**: Time-based escalation to arbitrators
- **Resolution Tracking**: Complete dispute lifecycle management

### Advanced Features
- **Smart Contract-like Logic**: Automated milestone releases and approvals
- **Real-time Webhooks**: Stripe event processing for instant updates
- **Performance Monitoring**: Response time and error rate tracking
- **Metrics Dashboard**: Comprehensive analytics and reporting

## 📁 File Structure

```
/apps/web/app/api/escrow/
├── route.ts                 # Main API endpoints
├── types.ts                 # TypeScript interfaces and schemas
├── stripe-connect.ts        # Stripe Connect integration
├── payment-splitter.ts      # Multi-party payment logic
├── milestone-tracker.ts     # Milestone management
├── dispute-handler.ts       # Dispute resolution system
├── document-vault.ts        # Encrypted document storage
├── transfer-automation.ts   # Automated transfer logic
├── webhooks.ts             # Stripe webhook handlers
├── error-handler.ts        # Error handling and audit logging
└── webhooks/
    └── route.ts            # Dedicated webhook endpoint
```

## 🔧 Setup & Configuration

### 1. Environment Variables

Add these environment variables to your `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_PLATFORM_ACCOUNT_ID=acct_...

# Escrow Configuration
MAX_ESCROW_AMOUNT=1000000
MIN_ESCROW_AMOUNT=100
DEFAULT_PLATFORM_FEE_PERCENT=5
MAX_ESCROW_PERIOD_DAYS=365
DEFAULT_APPROVAL_TIMEOUT_HOURS=72

# Security Configuration
ENCRYPTION_KEY=your-32-byte-encryption-key
DOCUMENT_STORAGE_BUCKET=escrow-documents
MAX_DOCUMENT_SIZE=50000000

# Monitoring Configuration
ENABLE_DETAILED_LOGGING=true
ENABLE_SECURITY_MONITORING=true
ENABLE_PERFORMANCE_MONITORING=true
ERROR_RATE_THRESHOLD=0.05
RESPONSE_TIME_THRESHOLD=5000
```

### 2. Database Migration

Run the database migration to create all necessary tables:

```bash
# Apply the escrow system migration
psql -d your_database -f infra/supabase/migrations/20250119_escrow_system.sql
```

### 3. Stripe Setup

1. **Create a Stripe Connect Application**:
   - Go to Stripe Dashboard → Connect → Get Started
   - Configure your application settings
   - Note your Connect Client ID

2. **Configure Webhooks**:
   - Add webhook endpoint: `https://yourdomain.com/api/escrow/webhooks`
   - Select these events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `transfer.created`
     - `transfer.paid`
     - `account.updated`
     - `charge.dispute.created`

3. **Test Mode Setup**:
   - Use test API keys for development
   - Use test Connect accounts for seller onboarding

## 📊 API Documentation

### Base URL
```
/api/escrow
```

### Authentication
All endpoints require authentication. Include user ID in headers:
```
X-User-ID: uuid-of-authenticated-user
```

### Core Endpoints

#### 1. Create Escrow
```http
POST /api/escrow
Content-Type: application/json

{
  "buyerId": "uuid",
  "sellerId": "uuid", 
  "siteId": "uuid",
  "totalAmount": 10000.00,
  "platformFeePercent": 5.0,
  "description": "Purchase of example.com",
  "terms": "Site transfer within 7 days...",
  "escrowPeriodDays": 30,
  "milestones": [
    {
      "title": "Site Transfer",
      "description": "Transfer domain and files",
      "amount": 5000.00,
      "dueDate": "2024-02-01T00:00:00Z",
      "requiresApproval": true
    },
    {
      "title": "Documentation",
      "description": "Provide analytics and docs", 
      "amount": 5000.00,
      "requiresApproval": true
    }
  ]
}
```

#### 2. List Escrows
```http
GET /api/escrow?page=1&limit=20&status=active&siteId=uuid
```

#### 3. Get Escrow Details
```http
GET /api/escrow/{escrowId}
```

#### 4. Update Milestone
```http
POST /api/escrow/{escrowId}/milestones
Content-Type: application/json

{
  "escrowId": "uuid",
  "milestoneId": "uuid",
  "status": "completed",
  "notes": "Milestone completed successfully",
  "attachments": ["file1.pdf", "screenshot.png"]
}
```

#### 5. Approve Milestone
```http
POST /api/escrow/{escrowId}/approve
Content-Type: application/json

{
  "milestoneId": "uuid",
  "notes": "Approved - good work",
  "autoRelease": true
}
```

#### 6. Create Dispute
```http
POST /api/escrow/{escrowId}/disputes
Content-Type: application/json

{
  "escrowId": "uuid",
  "milestoneId": "uuid",
  "reason": "Work not completed as agreed",
  "evidence": ["contract.pdf", "communication.png"],
  "requestedAction": "arbitration"
}
```

#### 7. Upload Document
```http
POST /api/escrow/{escrowId}/documents
Content-Type: multipart/form-data

file: [binary file data]
metadata: {
  "escrowId": "uuid",
  "type": "contract",
  "isPublic": false,
  "description": "Purchase agreement"
}
```

### Response Format

All API responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-19T12:00:00Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  },
  "timestamp": "2024-01-19T12:00:00Z"
}
```

## 🔒 Security Features

### 1. Payment Security
- **Stripe Connect**: All payment processing handled by Stripe
- **No Card Data Storage**: Full PCI compliance through Stripe
- **Manual Capture**: Payments held until milestone completion
- **Fraud Detection**: Built-in Stripe fraud prevention

### 2. Document Security
- **AES-256 Encryption**: All documents encrypted at rest
- **Access Controls**: Document access based on escrow participation
- **Integrity Verification**: SHA-256 checksums for all files
- **Secure Storage**: Encrypted file storage with Supabase

### 3. Database Security
- **Row Level Security**: Database-level access controls
- **Encrypted Connections**: All database connections use TLS
- **Audit Logging**: Complete audit trail for all operations
- **Input Validation**: Zod schemas for all inputs

### 4. API Security
- **Authentication Required**: All endpoints require valid user authentication
- **Authorization Checks**: Users can only access their own escrows
- **Rate Limiting**: Protection against abuse (configure separately)
- **Error Handling**: Secure error responses without data leakage

## 🎯 Usage Examples

### Complete Escrow Workflow

1. **Seller Setup**: Seller creates Stripe Connect account
2. **Escrow Creation**: Buyer creates escrow with milestones
3. **Payment**: Buyer funds escrow via Stripe
4. **Milestone Work**: Seller completes milestone work
5. **Milestone Submission**: Seller marks milestone as complete
6. **Buyer Review**: Buyer reviews and approves milestone
7. **Fund Release**: Funds automatically released to seller
8. **Completion**: All milestones completed, escrow closes

### Dispute Workflow

1. **Dispute Creation**: Party creates dispute with evidence
2. **Response Period**: Other party responds with counter-evidence
3. **Negotiation**: Parties attempt to resolve directly
4. **Escalation**: Dispute escalated to arbitrator if unresolved
5. **Arbitration**: Arbitrator reviews evidence and makes decision
6. **Resolution**: Funds distributed according to arbitrator decision

### Document Management

1. **Upload**: Parties upload due diligence documents
2. **Encryption**: Documents automatically encrypted
3. **Access Control**: Only escrow parties can access documents
4. **Sharing**: Documents can be shared with specific users
5. **Audit Trail**: All document access logged

## 📈 Monitoring & Analytics

### Error Monitoring
- Real-time error tracking with detailed context
- Security event detection and alerting
- Performance monitoring with response time tracking
- Automated alerting for critical issues

### Business Metrics
- Escrow volume and completion rates
- Platform fee revenue tracking
- Dispute resolution metrics
- User engagement analytics

### Audit Compliance
- Complete audit trail for all operations
- Immutable transaction records
- Compliance reporting capabilities
- Data retention policies

## 🔧 Development

### Testing
```bash
# Run tests
npm test

# Test specific escrow functionality
npm test -- escrow

# Test with coverage
npm run test:coverage
```

### Local Development
```bash
# Start development server
npm run dev

# Test webhook endpoints locally (use ngrok)
ngrok http 3000
# Update Stripe webhook URL to: https://your-ngrok-url.ngrok.io/api/escrow/webhooks
```

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Fill in all required environment variables
3. Run database migrations
4. Configure Stripe Connect application
5. Set up webhook endpoints

## 🚨 Production Deployment

### Pre-deployment Checklist
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Stripe Connect application configured
- [ ] Webhook endpoints configured
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backup systems in place

### Security Checklist
- [ ] All API endpoints authenticated
- [ ] Database RLS policies enabled
- [ ] Document encryption working
- [ ] Audit logging operational
- [ ] Error handling secure
- [ ] Rate limiting configured

### Performance Checklist
- [ ] Database indexes optimized
- [ ] Response times monitored
- [ ] Error rates tracked
- [ ] Webhook processing optimized
- [ ] Document storage efficient

## 🆘 Troubleshooting

### Common Issues

1. **Stripe Webhook Failures**
   - Verify webhook URL is accessible
   - Check webhook secret configuration
   - Review Stripe dashboard for failed events

2. **Document Upload Errors**
   - Check file size limits
   - Verify storage bucket permissions
   - Check encryption key configuration

3. **Escrow Creation Failures**
   - Verify Stripe Connect account setup
   - Check user authentication
   - Review milestone configuration

4. **Payment Processing Issues**
   - Check Stripe API keys
   - Verify Connect account capabilities
   - Review payment intent status

### Debug Mode
Enable detailed logging:
```bash
ENABLE_DETAILED_LOGGING=true
```

### Support
For issues and questions:
- Check the troubleshooting section
- Review error logs in the dashboard
- Contact the development team with trace IDs

## 📋 Roadmap

### Phase 1 (Current)
- ✅ Core escrow functionality
- ✅ Stripe Connect integration
- ✅ Milestone tracking
- ✅ Dispute resolution
- ✅ Document vault
- ✅ Webhook processing

### Phase 2 (Future)
- [ ] Advanced automation rules
- [ ] Multi-currency support
- [ ] Mobile app integration
- [ ] Advanced analytics dashboard
- [ ] Third-party integrations

### Phase 3 (Future)
- [ ] Smart contract integration
- [ ] Cross-border payments
- [ ] Advanced fraud detection
- [ ] AI-powered dispute resolution
- [ ] Multi-language support

## 📄 License

This escrow system is part of the AffiliateOS platform. All rights reserved.

---

**Built with security and reliability in mind for the AffiliateOS marketplace.**