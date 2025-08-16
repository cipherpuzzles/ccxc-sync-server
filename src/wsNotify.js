import { createClient } from 'redis';
import Config from './config.js';
import { fetchPost } from './utils/fetchPost.js';

let notifyServer = {};

async function subAndReceiveFromRedis() {
    let subRedis = createClient({
        host: Config.redis.host,
        port: Config.redis.port
    });
    subRedis.on("error", err => {
        console.error("Redis init error: " + err);
    });

    const listener = (messageStr, _) => {
        let message = JSON.parse(messageStr);

        if (!message.gid) return;
        let channelId = "Group_" + message.gid;

        let sendMessage = {
            cmd: 2,
            time: Date.now(),
            uid: message.uid,
            message: message.title,
            content: message.content,
            type: message.type,
            show_type: message.show_type
        };

        if (notifyServer[channelId]) {
            for (let ctx of notifyServer[channelId]) {
                sendJson(ctx.ws, sendMessage);
            }
        }
    };

    await subRedis.connect();
    await subRedis.subscribe("ccxc:notify", listener);
}

function sendJson(ws, json) {
    let str = JSON.stringify(json);
    ws.send(str);
}

function clean(ctx) {
    if (ctx && ctx.channel) {
        let channel = ctx.channel;
        if (notifyServer[channel]) {
            let index = notifyServer[channel].indexOf(ctx);
            if (index >= 0) {
                notifyServer[channel].splice(index, 1);
            }
        }
    }
}

function cleanTimeout() {
    let now = Date.now();
    for (let channel in notifyServer) {
        let ctxList = notifyServer[channel];
        for (let ctx of ctxList) {
            if (now - ctx.lastTimestamp > 120 * 1000) {
                //超过2分钟没有心跳，断开连接
                ctx.ws.close();
                clean(ctx);
            }
        }
    }
}

subAndReceiveFromRedis();
setInterval(cleanTimeout, 60 * 1000);

/**
 * 通知服务器协议
 * cmd: 0-服务器消息（客户端不回显） 1-心跳 2-通知（客户端显示） 3-新消息数
 * message: 消息内容（cmd为2时为消息标题）
 * content: 消息正文
 * type: 消息类型（info-信息，用于提示解锁进度 warning-用于提示milestone success-用于提示成功 danger-用于提示错误）
 */

export async function roomNotify(ws, userSession, redis) {
    let channelId = "Group_" + userSession.gid;

    let wsCtx = {
        ws: ws,
        userSession: userSession,
        lastTimestamp: Date.now(),
        channel: channelId
    }

    //加入到通知服务器中的指定频道
    if (!notifyServer[channelId]) {
        notifyServer[channelId] = [];
    }
    notifyServer[channelId].push(wsCtx);

    //处理客户端消息
    ws.on('message', (messageStr) => {
        let message = JSON.parse(messageStr);
        if (!message.cmd) {
            sendJson(ws, {
                cmd: 0,
                message: "Invalid request."
            });
        }

        switch (message.cmd) {
            case 1: {
                //心跳
                wsCtx.lastTimestamp = Date.now();
                sendJson(ws, {
                    cmd: 1,
                    message: "OK"
                });
                getNewAnnoCountAndNewMessageCount(userSession, redis, ws);
            }
            break;
            default:
            break;
        }
    });
    ws.on('close', () => {
        clean(wsCtx);
    });
}

async function getNewAnnoCountAndNewMessageCount(userSession, redis, ws) {
    try {
        let newAnnoCount = 0;
        let newMessageCount = 0;

        // 获取用户已读公告
        try {
            let userReadKey = `ccxc:recordcache:read_anno_id_for_${userSession.uid}`;
            let userReadString = await redis.get(userReadKey);

            let userRead = [];
            if (userReadString) {
                userRead = JSON.parse(userReadString);
            }

            // 获取所有公告
            let annoListKey = `ccxc:datacache:announcement_id_cache`;
            let annoListString = await redis.get(annoListKey);

            let annoList = [];
            if (annoListString) {
                let annoListData = JSON.parse(annoListString);
                if (annoListData[0]) {
                    annoList = annoListData[0];
                }
            }

            // 计算未读公告数
            for (let anno of annoList) {
                if (userRead.indexOf(anno) < 0) {
                    newAnnoCount++;
                }
            }
        } catch (redisError) {
            console.error("Redis error in getNewAnnoCountAndNewMessageCount:", redisError);
            // Redis 错误时，保持 newAnnoCount 为 0
        }

        // 调用heartbeat-inner接口获取新消息数
        try {
            let res = await fetchPost("/heartbeat-inner", {
                gid: userSession.gid,
                token: "MuksnTyjoS5aZ7y8XIvmW4wy8W0LQ9r4w2ov"
            });

            let data = await res.json();

            if (data.status == 1) {
                newMessageCount = data.nm;
            }
        } catch (fetchError) {
            console.error("FetchPost error in getNewAnnoCountAndNewMessageCount:", fetchError);
            // 网络请求错误时，保持 newMessageCount 为 0
        }

        // 只有在有未读内容时才发送
        if (newAnnoCount > 0 || newMessageCount > 0) {
            sendJson(ws, {
                cmd: 3,
                unread: newAnnoCount,
                new_message: newMessageCount
            });
        }
    } catch (error) {
        console.error("Unexpected error in getNewAnnoCountAndNewMessageCount:", error);
    }
}