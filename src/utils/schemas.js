const { z } = require('zod');

// The core subject schema — what a compliance officer submits
const SubjectSchema = z.object({
  // Required
  fullName: z.string().min(2).max(200).trim(),

  // Strongly recommended — improves match accuracy significantly
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
  nationality: z.string().length(2, 'Must be ISO 3166-1 alpha-2 country code (e.g. GB, US)').toUpperCase().optional(),

  // Optional enrichment fields
  aliases: z.array(z.string()).max(5).optional(),
  companyName: z.string().max(200).optional(),
  walletAddress: z.string().max(100).optional(), // BTC or ETH address

  // Check configuration
  checkLayers: z.array(z.enum([
    'sanctions',    // Layer 1 — always run
    'pep',          // Layer 2
    'adverseMedia', // Layer 3
    'corporate',    // Layer 4
    'crypto',       // Layer 5
    'osint',        // Layer 6 — Phase 2
  ])).default(['sanctions', 'pep', 'adverseMedia']),
});

// What gets stored per check
const CheckRecordSchema = z.object({
  checkId: z.string().uuid(),
  createdAt: z.string().datetime(),
  status: z.enum(['pending', 'running', 'complete', 'failed']),
  subject: SubjectSchema,
  results: z.any().optional(),
  score: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  durationMs: z.number().optional(),
});

module.exports = { SubjectSchema, CheckRecordSchema };
