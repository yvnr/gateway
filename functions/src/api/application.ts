import {Router, Request, Response} from 'express';
import axios from 'axios';

const router = Router();


router.use(async (req: Request, res: Response) => {
  try {
    const receivedRes = await axios({
      url: res.locals['url'],
      method: req.method,
      headers: req.headers,
      params: req.query,
      data: req.body,
    });
    return res.status(receivedRes.status).send(receivedRes.data);
  } catch (err: any) {
    return res.status(err.response.status).send(err.response.data);
  }
});

export default router;
