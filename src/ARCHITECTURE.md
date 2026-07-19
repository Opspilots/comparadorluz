- Row-Level Security (RLS) enforces company_id scoping
- All tables (except auth) have `company_id` foreign key

### 2. CRM Domain

**Entities:**
- **customers**: B2B companies (identified by CIF)
- **contacts**: People at customer companies
- **supply_points**: Physical locations with energy meters
- **activities**: Interaction history (calls, emails, meetings)

**Key Decisions:**
- Customer CIF is the primary identifier (not email)
- Lead status workflow: prospecto → contactado → calificado → propuesta → cerrado/perdido
- Supply points store: CUPS (energy meter ID), address, consumption history

### 3. Tariff Engine Domain

**Entities:**
- **tariff_batches**: Upload sessions for tariff updates
- **tariff_files**: Individual PDFs within a batch
--
### Security
- RLS enforces tenant isolation
- API keys are access-controlled via Supabase
- PDFs are stored with signed URLs (short-lived)
- All passwords are hashed with bcrypt
- HTTPS is enforced for all communications
- Regular security audits and vulnerability assessments
- Two-factor authentication (2FA) for admin users
- Data backup and recovery procedures in place
- Encryption of sensitive data both at rest and in transit
- Use of environment variables to store secrets
- Rate limiting on API endpoints to prevent abuse
--
### Scalability
- Target: 100 companies, 1000 users, 10k comparisons/month
- Database: partitioning by company_id if needed
- Storage: S3-backed via Supabase

### Compliance
- GDPR: data export + deletion workflows
- Audit retention: 7 years minimum
- Data encryption at rest and in transit

## Migration Strategy

1. **Phase 1**: Core tables + auth
2. **Phase 2**: Tariff engine + batch pipeline
3. **Phase 3**: Messaging & Campaigns (CRM Adaptation)
--
- **RLS**: Row-Level Security in PostgreSQL