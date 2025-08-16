import url from 'url';
import WebSocket from 'ws';
import compose from 'koa-compose';
import co from 'co';

class KoaWebsocketServer {
    constructor(app) {
        this.app = app;
        this.middleware = [];
    }
    listen(options) {
        this.server = new WebSocket.Server(options);
        this.server.on('connection', (socket, req) => {
            socket.on('error', (err) => {
                console.error(err);
            });
            const fn = co.wrap(compose(this.middleware));

            const ctx = this.app.createContext(req);
            ctx.websocket = socket;
            ctx.path = url.parse(req.url).pathname;

            fn(ctx).catch((err) => {
                console.error(err);
            });
        });
    }
    use(fn) {
        this.middleware.push(fn);
        return this;
    }
}

export default function middleware(app) {
    const oldListen = app.listen;
    app.listen = function (...args) {
        app.server = oldListen.apply(app, args);
        const wsOptions = {
            server: app.server
        };
        app.ws.listen(wsOptions);
        return app.server;
    }
    app.ws = new KoaWebsocketServer(app);
    return app;
}