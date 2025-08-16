import Router from 'koa-router';
import { TestApi } from './controllers/spfunc';
import { getAllDocs, deleteDocByName, deleteAllDocs } from './controllers/admin';

// SpFunc
const spfunc = new Router();
spfunc.post('/testapi', TestApi);

// Admin
const admin = new Router();
admin.post('/getAllDocs', getAllDocs);
admin.post('/deleteDocByName', deleteDocByName);
admin.post('/deleteAllDocs', deleteAllDocs);

const router = new Router();
router.use('/spfunc', spfunc.routes(), spfunc.allowedMethods());
router.use('/admin', admin.routes(), admin.allowedMethods());

const rootRouter = new Router();
rootRouter.use('/ws-api', router.routes(), router.allowedMethods());
export default rootRouter;
