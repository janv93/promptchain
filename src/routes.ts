import { Router, Request, Response } from 'express';
import BrainGpt from './promptchains/braingpt';
import Conversaition from './promptchains/conversaition';
import Autocoder from './promptchains/autocoder/autocoder';

let id = 1;
let conversaitions: Map<number, Conversaition> = new Map();

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.statusCode = 200;
  res.json({ message: 'Running.' });
});

router.post('/braingpt', async (req: Request, res: Response) => {
  const brainGpt = new BrainGpt();
  const response = await brainGpt.chain(req.body.prompt);
  res.send(response);
});

router.get('/conversaition', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = id++;
  const client = new Conversaition(req.query.prompt as string, req.query.apiKey as string, res);
  conversaitions.set(clientId, client);

  res.write(`data: ${JSON.stringify({ type: 'id', data: clientId })}\n\n`);

  req.on('close', () => {
    conversaitions.delete(clientId);
  });
});

router.get('/conversaition/:id', (req, res) => {
  const id: number = parseInt(req.params.id);
  const conversaition = conversaitions.get(id);

  if (conversaition) {
    conversaition.triggerUserAnswer(req.query.answer as string);
    res.json({ status: "OK" });  // Send a JSON response here
  } else {
    res.status(404).json({ error: "Conversation not found" }); // It's also good to send some information about the error
  }
});

router.post('/autocoder', async (req: Request, res: Response) => {
  const autocoder = new Autocoder(req.body.apiKey);
  const response = await autocoder.chain(req.body.prompt, (req as any).files[0]);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=${(req as any).files[0].originalname}`);
  res.send(response);
});

export default router;