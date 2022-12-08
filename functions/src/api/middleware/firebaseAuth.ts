import {Request, Response, NextFunction} from 'express';
import {auth} from '../../admin';


enum RequestMethods {
  GET = 'GET', PUT = 'PUT', POST = 'POST', PATCH ='PATCH'
}

export default async function(req: Request, res: Response, next: NextFunction) {
  console.info('checking the oauth');
  console.info(req.url);
  console.info(req.originalUrl);
  console.info(req.url.endsWith('user/register'));
  if (req.url.includes('register') && req.method == RequestMethods.POST) {
    return next();
  }

  const authorization = req.headers['authorization'];
  if (!authorization) {
    return res.status(401).send({
      code: 'unauthorized',
      message: 'You are not authorized to make this request',
    });
  }

  const [type, idToken] = authorization.split(' ');

  if (type !== 'idToken' || !idToken) {
    return res.status(401).send({
      code: 'unauthorized',
      message: 'You are not authorized to make this request',
    });
  }
  try {
    const decodedToken = await auth().verifyIdToken(idToken, true);
    const userRecord = await auth().getUser(decodedToken.uid);
    req.headers['x-uid'] = userRecord.uid;
    req.headers['x-univ-id'] = userRecord.customClaims?.univId as string;
    return next();
  } catch (error) {
    return res.status(401).send({
      code: 'unauthorized',
      message: 'You are not authorized to make this request',
    });
  }
}
