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
    await service.deleteCandidate(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
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
