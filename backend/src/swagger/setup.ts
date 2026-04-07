import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const openApiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'HR Recruitment System API',
    version: '1.0.0',
    description: `
Internal HR Recruitment System — replaces Google Sheets + Excel workflows.

## Authentication
- **Bearer JWT**: Azure AD token for frontend users
- **X-API-Key**: Static key for n8n workflows (header: \`X-API-Key\`)

## n8n Migration Guide
| Old Action | New Endpoint |
|---|---|
| Google Sheets append candidate | POST /api/candidates |
| Google Sheets read pending | GET /api/candidates?status=pending&limit=100 |
| Google Sheets update AI review | PATCH /api/candidates/{emailId}/ai-review |
| Google Sheets read availability | GET /api/availability?location=X&dayOfWeek=Y |
| Google Sheets read booked slots | GET /api/appointments?location=X&date=Y |
| Google Sheets write booking | POST /api/appointments |
| Google Sheets update transcript | PATCH /api/candidates/{emailId}/call-result |
| Google Sheets read all | GET /api/candidates?limit=9999 |
| Google Sheets reset problematic | POST /api/candidates/reset-problematic |
    `,
  },
  servers: [{ url: '/api', description: 'API base' }],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
    schemas: {
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: {} },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
      Candidate: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          postingName: { type: 'string' },
          location: { type: 'string' },
          candidateName: { type: 'string' },
          phone: { type: 'string', nullable: true },
          dateApplied: { type: 'string', nullable: true },
          hiringManager: { type: 'string', nullable: true },
          recruiter: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['pending', 'reviewed', 'called', 'not_found', 'processed_no_resume'] },
          receivedAt: { type: 'string', format: 'date-time', nullable: true },
          emailId: { type: 'string' },
          aiScore: { type: 'number', nullable: true },
          aiRecommendation: { type: 'string', enum: ['ACCEPT', 'MAYBE', 'REJECT'], nullable: true },
          aiCriteriaMet: { type: 'string', nullable: true },
          aiCriteriaMissing: { type: 'string', nullable: true },
          aiSummary: { type: 'string', nullable: true },
          reviewedAt: { type: 'string', format: 'date-time', nullable: true },
          called: { type: 'string', nullable: true },
          transcript: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          location: { type: 'string' },
          managerName: { type: 'string', nullable: true },
          managerEmail: { type: 'string', nullable: true },
          candidateName: { type: 'string' },
          jobRole: { type: 'string', nullable: true },
          interviewDate: { type: 'string', format: 'date-time' },
          day: { type: 'string', nullable: true },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          slotDuration: { type: 'string' },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ManagerAvailability: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          location: { type: 'string' },
          managerName: { type: 'string' },
          managerEmail: { type: 'string' },
          dayOfWeek: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          slotDuration: { type: 'string' },
          active: { type: 'boolean' },
        },
      },
      AvailabilitySlot: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          day: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          managerName: { type: 'string' },
          managerEmail: { type: 'string' },
          location: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/candidates': {
      get: {
        tags: ['Candidates'],
        summary: 'List candidates with pagination and filters',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'reviewed', 'called', 'not_found', 'processed_no_resume'] } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'postingName', in: 'query', schema: { type: 'string' } },
          { name: 'aiRecommendation', in: 'query', schema: { type: 'string', enum: ['ACCEPT', 'MAYBE', 'REJECT'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by candidateName' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'aiScore', 'candidateName'], default: 'createdAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          200: { description: 'Paginated candidate list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        },
      },
      post: {
        tags: ['Candidates'],
        summary: 'Create new candidate (n8n)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['postingName', 'location', 'candidateName', 'emailId'],
                properties: {
                  postingName: { type: 'string', example: 'LCF Cashier' },
                  location: { type: 'string', example: 'LCF Airtex' },
                  candidateName: { type: 'string', example: 'John Smith' },
                  phone: { type: 'string', example: '5551234567' },
                  dateApplied: { type: 'string', example: '23 Feb 2026' },
                  hiringManager: { type: 'string', example: 'Emerson Medrano' },
                  recruiter: { type: 'string' },
                  status: { type: 'string', default: 'pending' },
                  receivedAt: { type: 'string', format: 'date-time' },
                  emailId: { type: 'string', example: '19c8cd9c4505a04f' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created candidate', content: { 'application/json': { schema: { $ref: '#/components/schemas/Candidate' } } } },
          409: { description: 'emailId already exists' },
        },
      },
    },
    '/candidates/{id}': {
      get: {
        tags: ['Candidates'],
        summary: 'Get candidate by DB id',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Candidate', content: { 'application/json': { schema: { $ref: '#/components/schemas/Candidate' } } } }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Candidates'],
        summary: 'Manual edit by HR/Admin',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Updated candidate' } },
      },
      delete: {
        tags: ['Candidates'],
        summary: 'Soft-delete candidate (ADMIN only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' }, 403: { description: 'Forbidden' } },
      },
    },
    '/candidates/by-email/{emailId}': {
      get: {
        tags: ['Candidates'],
        summary: 'Get candidate by Gmail emailId (n8n)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'emailId', in: 'path', required: true, schema: { type: 'string' }, example: '19c8cd9c4505a04f' }],
        responses: { 200: { description: 'Candidate' }, 404: { description: 'Not found' } },
      },
    },
    '/candidates/{emailId}/ai-review': {
      patch: {
        tags: ['Candidates'],
        summary: 'Update AI score/recommendation (n8n)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'emailId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  aiScore: { type: 'number', example: 80 },
                  aiRecommendation: { type: 'string', enum: ['ACCEPT', 'MAYBE', 'REJECT'] },
                  aiCriteriaMet: { type: 'string' },
                  aiCriteriaMissing: { type: 'string' },
                  aiSummary: { type: 'string' },
                  status: { type: 'string', example: 'reviewed' },
                  reviewedAt: { type: 'string', format: 'date-time' },
                  candidateName: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated candidate' } },
      },
    },
    '/candidates/{emailId}/call-result': {
      patch: {
        tags: ['Candidates'],
        summary: 'Update call transcript and status (n8n / Vapi)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'emailId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  transcript: { type: 'string' },
                  called: { type: 'string', example: 'yes' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated candidate' } },
      },
    },
    '/candidates/reset-problematic': {
      post: {
        tags: ['Candidates'],
        summary: 'Reset stuck candidates back to pending (n8n)',
        security: [{ ApiKeyAuth: [] }],
        responses: { 200: { description: 'Reset count', content: { 'application/json': { schema: { type: 'object', properties: { reset: { type: 'integer' } } } } } } },
      },
    },
    '/appointments': {
      get: {
        tags: ['Appointments'],
        summary: 'List appointments',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string' }, description: 'YYYY-MM-DD' },
          { name: 'managerEmail', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated appointments' } },
      },
      post: {
        tags: ['Appointments'],
        summary: 'Book appointment (n8n / Vapi)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['location', 'candidateName', 'interviewDate', 'startTime', 'endTime'],
                properties: {
                  location: { type: 'string', example: 'LCF Airtex' },
                  managerName: { type: 'string', example: 'Tom' },
                  managerEmail: { type: 'string', example: 'tom@aygfoods.com' },
                  candidateName: { type: 'string', example: 'Henz' },
                  jobRole: { type: 'string', example: 'Cook' },
                  interviewDate: { type: 'string', example: '2026-04-11' },
                  day: { type: 'string', example: 'Saturday' },
                  startTime: { type: 'string', example: '17:00' },
                  endTime: { type: 'string', example: '17:20' },
                  slotDuration: { type: 'string', default: '20 min' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created appointment' } },
      },
    },
    '/appointments/{id}': {
      get: { tags: ['Appointments'], summary: 'Get appointment by id', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Appointment' } } },
      patch: { tags: ['Appointments'], summary: 'Edit appointment (MANAGER+)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Appointments'], summary: 'Cancel appointment (MANAGER+)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Cancelled' } } },
    },
    '/availability': {
      get: {
        tags: ['Availability'],
        summary: 'List manager availability windows',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'dayOfWeek', in: 'query', schema: { type: 'string' } },
          { name: 'managerEmail', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Availability list' } },
      },
      post: {
        tags: ['Availability'],
        summary: 'Add availability window (MANAGER+)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['location', 'managerName', 'managerEmail', 'dayOfWeek', 'startTime', 'endTime'],
                properties: {
                  location: { type: 'string' },
                  managerName: { type: 'string' },
                  managerEmail: { type: 'string' },
                  dayOfWeek: { type: 'string', example: 'Saturday' },
                  startTime: { type: 'string', example: '15:00' },
                  endTime: { type: 'string', example: '18:00' },
                  slotDuration: { type: 'string', default: '20 Min' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/availability/slots': {
      get: {
        tags: ['Availability'],
        summary: 'Get free 20-min slots for a specific date (n8n / Vapi)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'location', in: 'query', required: true, schema: { type: 'string' }, example: 'LCF Airtex' },
          { name: 'dayOfWeek', in: 'query', required: true, schema: { type: 'string' }, example: 'Saturday' },
          { name: 'date', in: 'query', required: true, schema: { type: 'string' }, example: '2026-04-12' },
        ],
        responses: {
          200: {
            description: 'Free slots array',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    slots: { type: 'array', items: { $ref: '#/components/schemas/AvailabilitySlot' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/availability/{id}': {
      get: { tags: ['Availability'], summary: 'Get single availability window', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Availability window' } } },
      patch: { tags: ['Availability'], summary: 'Edit availability window (MANAGER+)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Availability'], summary: 'Remove availability window (MANAGER+)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Deleted' } } },
    },
    '/users': {
      get: { tags: ['Users'], summary: 'List all users (ADMIN)', security: [{ BearerAuth: [] }], responses: { 200: { description: 'User list' } } },
    },
    '/users/me': {
      get: { tags: ['Users'], summary: 'Get current user info', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Current user' } } },
    },
    '/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Change user role (ADMIN)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'HR'] } } } } } },
        responses: { 200: { description: 'Updated user' } },
      },
    },
    '/users/{id}/deactivate': {
      patch: {
        tags: ['Users'],
        summary: 'Deactivate user (ADMIN)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deactivated user' } },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc, {
    customSiteTitle: 'HR Recruitment API',
    customCss: '.swagger-ui .topbar { display: none }',
  }));
  // Also expose raw JSON
  app.get('/api/docs.json', (_req, res) => res.json(openApiDoc));
}
