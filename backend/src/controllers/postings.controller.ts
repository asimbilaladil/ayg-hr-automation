import { Request, Response, NextFunction } from 'express';
import * as service from '../services/postings.service';
import {
  CreatePostingSchema,
  UpdatePostingSchema,
} from '../schemas/posting.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const postings = await service.listPostings();
    res.json({ data: postings, total: postings.length });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const posting = await service.getPostingById(req.params.id);
    res.json(posting);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreatePostingSchema.parse(req.body);
    const posting = await service.createPosting(data);
    res.status(201).json(posting);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdatePostingSchema.parse(req.body);
    const posting = await service.updatePosting(req.params.id, data);
    res.json(posting);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deletePosting(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
