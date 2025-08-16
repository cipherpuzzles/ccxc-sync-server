import * as Y from 'yjs';
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils';
import { roomNotify } from './wsNotify';
import { ldb } from './utils/leveldb';

//设置Yjs的持久化

setPersistence({
    provider: ldb,
    bindState: async (room, yDoc) => {
        const persistedYDoc = await ldb.getYDoc(room);
        const newUpdates = Y.encodeStateAsUpdate(yDoc);
        ldb.storeUpdate(room, newUpdates);
        Y.applyUpdate(yDoc, Y.encodeStateAsUpdate(persistedYDoc));
        yDoc.on('update', (update) => {
            ldb.storeUpdate(room, update);
        });
    },
    writeState: async (room, yDoc) => {}
});

export default async function WsServer(ctx) {
    let wsPath = ctx.path;
    
    // 检查WebSocket连接状态的辅助函数
    function closeWithError(code, message) {
        try {
            if (ctx.websocket.readyState === ctx.websocket.OPEN) {
                ctx.websocket.send(JSON.stringify({
                    type: 'error',
                    code: code,
                    message: message
                }));
                
                // 延迟1秒后关闭连接，确保客户端能收到错误消息
                setTimeout(() => {
                    if (ctx.websocket.readyState === ctx.websocket.OPEN || 
                        ctx.websocket.readyState === ctx.websocket.CONNECTING) {
                        ctx.websocket.close(1008, message);
                    }
                }, 1000);
            } else {
                // 如果连接不是OPEN状态，立即关闭
                if (ctx.websocket.readyState === ctx.websocket.CONNECTING) {
                    ctx.websocket.close(1008, message);
                }
            }
        } catch (err) {
            console.error('Error sending WebSocket message:', err);
            // 即使发送失败也要关闭连接
            if (ctx.websocket.readyState === ctx.websocket.OPEN || 
                ctx.websocket.readyState === ctx.websocket.CONNECTING) {
                ctx.websocket.close(1008, message);
            }
        }
    }
    
    //从请求参数中取得sessionId
    let sessionId = ctx.query.sessionId;
    if (!sessionId) {
        closeWithError(1, "Invalid request.");
        return;
    }

    //从Redis中取得session
    let key = `ccxc:usersession:${sessionId}`;
    let userSessionString = await ctx.redis.get(key);

    if (!userSessionString) {
        closeWithError(2, "Invalid session.");
        return;
    }

    let userSession = JSON.parse(userSessionString);

    if (userSession.is_active !== 1) {
        closeWithError(3, "Invalid session (not active).");
        return;
    }

    if (!userSession.gid) {
        closeWithError(4, "Invalid session (not gid).");
        return;
    }


    //从请求参数中读取type
    let type = ctx.query.type;
    if (type === "adminTags") {
        if (userSession.roleid < 4) {
            closeWithError(403, "Forbidden.");
            return;
        }
    }

    //从Session中取得用户加入的Yjs的房间（用户的组ID）
    let uid = userSession.uid;
    let groupId = userSession.gid;
    let username = userSession.username;
    let roomName = `room_${groupId}`;

    if (type === "adminTags") {
        roomName = `room_admin_tags`;
    }

    console.log(`connection established: user ${uid} <${username}> joined room: ${roomName}`);

    if (wsPath === '/ws-api/sync') {
        //连接到Yjs的房间
        setupWSConnection(ctx.websocket, null, { docName: roomName, gc: true });
    } else if (wsPath === '/ws-api/notify') {
        //连接WS通知房间
        roomNotify(ctx.websocket, userSession, ctx.redis);
    } else {
        closeWithError(404, "Invalid request.");
        return;
    }
}