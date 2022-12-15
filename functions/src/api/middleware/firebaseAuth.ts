import {Request, Response, NextFunction} from 'express';
import {auth, firestore} from '../../admin';


enum RequestMethods {
  GET = 'GET', PUT = 'PUT', POST = 'POST', PATCH ='PATCH'
}

export default async function(req: Request, res: Response, next: NextFunction) {
  console.info('checking the oauth');
  if (req.url.includes('register') && req.method == RequestMethods.POST) {
    return next();
  }

  // checking the authorization header
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
    // verifying the idToken
    const decodedToken = await auth().verifyIdToken(idToken, true);
    const userRecord = await auth().getUser(decodedToken.uid);

    // getting the serviceName secrets
    const [, pathUrl]= req.originalUrl.split('/api');
    const pathKeys = pathUrl.split('/');
    if (pathKeys.length == 1) {
      return res.status(400).send({
        code: 'invalid-url',
        message: 'Invalid URL',
      });
    }

    const serviceName = pathKeys[1];
    const servicesDoc = await firestore().collection('secrets').doc('services').get();

    if (!servicesDoc.exists) {
      return res.status(400).send({
        code: 'invalid-url',
        message: 'Invalid URL',
      });
    }

    const servicesData = servicesDoc.data() as Record<string, {domain:string, apiKey:string, apiSecret: string}>;


    if (!servicesData[serviceName]) {
      return res.status(400).send({
        code: 'invalid-url',
        message: 'Invalid URL',
      });
    }

    const {domain, apiKey, apiSecret} = servicesData;
    res.locals['url'] = domain + pathUrl;
    req.headers = {
      'x-uid': userRecord.uid,
      'x-univ-id': userRecord.customClaims?.univId as string,
      'Authorization': `${apiKey} ${apiSecret}`,
      'Content-Type': 'application/json',
    };
    return next();
  } catch (error) {
    return res.status(401).send({
      code: 'unauthorized',
      message: 'You are not authorized to make this request',
    });
  }
}
