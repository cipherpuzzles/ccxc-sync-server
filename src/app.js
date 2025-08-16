import Koa from 'koa'
import websockify from './utils/websocket';

import redis from './utils/redis';
import parseJson from './parseJson';
import WsServer from './wsServer'
import rootRouter from './router';

const app = websockify(new Koa());

app.use(redis);
app.use(parseJson);
app.use(rootRouter.routes()).use(rootRouter.allowedMethods());
app.ws.use(redis);
app.ws.use(WsServer);
app.listen(15562, () => {
    console.log('Server started on port 15562');
});

