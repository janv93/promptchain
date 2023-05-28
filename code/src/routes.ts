import { Router, Request, Response } from 'express';
import BrainGpt from './promptchains/braingpt';
import Conversaition from './promptchains/conversaition';

let id = 1;
let clients: Map<number, Conversaition> = new Map();

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.statusCode = 200;
  res.end('Running.');
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
  const client = new Conversaition(req.query.prompt as string, res);
  clients.set(clientId, client);

  res.write(`data: ${JSON.stringify({ type: 'id', data: clientId })}\n\n`);

  req.on('close', () => {
    clients.delete(clientId);
  });
});

router.post('/conversaition/:id', (req, res) => {
  const id: number = parseInt(req.params.id);
  const client = clients.get(id);

  if (client) {
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

export default router;