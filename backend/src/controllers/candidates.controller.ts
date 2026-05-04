import { Request, Response, NextFunction } from 'express';
import * as service from '../services/candidates.service';
import {
  CreateCandidateSchema,
  UpdateAIReviewSchema,
  UpdateCallResultSchema,
  UpdateCandidateSchema,
  CandidateQuerySchema,
} from '../schemas/candidate.schema';

/**
 * Google Sheets stores formula-cell values with a leading "=" sign.
 * Strip it so the emailId lookup doesn't fail.
 */
function sanitizeEmailId(raw: string): string {
  return raw.startsWith('=') ? raw.slice(1) : raw;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = CandidateQuerySchema.parse(req.query);
    // Managers see only their own candidates; Admin/HR/n8n see everything
    const scopedManagerId =
      req.user?.role === 'MANAGER' ? req.user.id : undefined;
    const result = await service.listCandidates(query, scopedManagerId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const candidate = await service.getCandidateById(req.params.id);
    res.json(candidate);
  } catch (err) { next(err); }
}

export async function getByEmailId(req: Request, res: Response, next: NextFunction) {
  try {
    const emailId = sanitizeEmailId(req.params.emailId);
    const candidate = await service.getCandidateByEmailId(emailId);
    res.json(candidate);
  } catch (err) { next(err); }
}

export async function getByPhone(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = req.params.phone || (req.query.phone as string);
    if (!phone) {
      res.status(400).json({ error: 'phone parameter is required' });
      return;
    }
    const candidate = await service.getCandidateByPhone(phone);
    res.json({ found: true, candidate });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      res.status(404).json({ found: false, candidate: null, message: 'No candidate found with this phone number' });
      return;
    }
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreateCandidateSchema.parse(req.body);
    const candidate = await service.createCandidate(data);
    res.status(201).json(candidate);
  } catch (err) { next(err); }
}

export async function updateAIReview(req: Request, res: Response, next: NextFunction) {
  try {
    const emailId = sanitizeEmailId(req.params.emailId);
    const data = UpdateAIReviewSchema.parse(req.body);
    const candidate = await service.updateAIReview(emailId, data);
    res.json(candidate);
  } catch (err) { next(err); }
}

export async function updateCallResult(req: Request, res: Response, next: NextFunction) {
  try {
    const emailId = sanitizeEmailId(req.params.emailId);
    const data = UpdateCallResultSchema.parse(req.body);
    const candidate = await service.updateCallResult(emailId, data);
    res.json(candidate);
  } catch (err) { next(err); }
}

// ID-based versions (use candidateId CUID instead of emailId)
export async function updateAIReviewById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdateAIReviewSchema.parse(req.body);
    const candidate = await service.updateAIReviewById(req.params.candidateId, data);
    res.json(candidate);
  } catch (err) { next(err); }
}

export async function updateCallResultById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdateCallResultSchema.parse(req.body);
    const candidate = await service.updateCallResultById(req.params.candidateId, data);
    res.json(candidate);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdateCandidateSchema.parse(req.body);
    const candidate = await service.updateCandidate(req.params.id, data);
    res.json(candidate);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    // Route param is :id — could be a CUID or an emailId; service handles both
    const identifier = req.params.id;
    const result = await service.deleteCandidate(identifier);
    res.status(200).json(result);
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }
    next(err);
  }
}

export async function resetProblematic(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.resetProblematicCandidates();
    res.json(result);
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const emailId = sanitizeEmailId(req.params.emailId);
    const { status } = req.body;

    const candidate = await service.updateCandidateStatus(emailId, {
      status,
    });

    res.json(candidate);
  } catch (err) { next(err); }
}

export async function getResume(req: Request, res: Response, next: NextFunction) {
  try {
    const { emailId } = req.params;
    await service.getResume(emailId, res);
  } catch (err) { next(err); }
}
