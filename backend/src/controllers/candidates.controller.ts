import { Request, Response, NextFunction } from 'express';
import * as service from '../services/candidates.service';
import {
  CreateCandidateSchema,
  UpdateAIReviewSchema,
  UpdateCallResultSchema,
  UpdateCandidateSchema,
  CandidateQuerySchema,
} from '../schemas/candidate.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = CandidateQuerySchema.parse(req.query);
    const result = await service.listCandidates(query);
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
    const candidate = await service.getCandidateByEmailId(req.params.emailId);
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
    const data = UpdateAIReviewSchema.parse(req.body);
    const candidate = await service.updateAIReview(req.params.emailId, data);
    res.json(candidate);
  } catch (err) { next(err); }
}

export async function updateCallResult(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdateCallResultSchema.parse(req.body);
    const candidate = await service.updateCallResult(req.params.emailId, data);
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

export const updateCandidateStatus = async (req, res) => {
  try {
    const { emailId } = req.params;
    const { status, resumeUrl } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const candidate = await prisma.candidate.update({
      where: { emailId },
      data: {
        status,
        ...(resumeUrl && { resumeUrl })
      }
    });

    return res.json({
      success: true,
      data: candidate
    });

  } catch (error) {
    console.error("Status update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update status"
    });
  }
};
