import { Router, Request, Response } from 'express';
import BrainGpt from './promptchains/braingpt';

const router = Router();
const brainGpt = new BrainGpt();

router.post('/braingpt', async (req: Request, res: Response) => {
  const response = await brainGpt.run(req.body.prompt);
  res.send(response);
});

export default router;