import { Router, Request, Response } from 'express';
import BrainGpt from './promptchains/braingpt';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.statusCode = 200;
  res.end();
});

router.post('/braingpt', async (req: Request, res: Response) => {
  const brainGpt = new BrainGpt();
  const response = await brainGpt.chain(req.body.prompt);
  res.send(response);
});

export default router;