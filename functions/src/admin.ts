import * as fadmin from 'firebase-admin';

export const app = fadmin.initializeApp();

export {auth, database, firestore, storage, messaging} from 'firebase-admin';
