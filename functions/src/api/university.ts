import {Router, Request, Response} from 'express';
import axios from 'axios';
import secrets from '../secrets';

const router = Router();

const domain = secrets.services['record']['domain'];
const appServiceHeaders = {
  'Authorization': `${secrets.services['record']['serviceId']} ${secrets.services['record']['apiKey']}`,
  'Content-Type': 'application/json',
};

router.use(async (req: Request, res: Response) => {
  try {
    const [, pathUrl]= req.originalUrl.split('/api');
    const url = domain + pathUrl;
    const receivedRes = await axios({
      url,
      method: req.method,
      headers: Object.assign({}, req.headers, appServiceHeaders),
      params: req.query,
      data: req.body,
    });
    return res.status(receivedRes.status).send(receivedRes.data);
  } catch (err: any) {
    console.info(err);
    return res.status(err.response.status).send(err.response.data);
  }
});

export default router;
