import { createClient } from 'redis'
import Config from '../config'

class RedisConn{
    constructor(){
        this.conn = createClient({
            host: Config.redis.host,
            port: Config.redis.port
        });
        this.conn.connect();
        this.conn.on("error", err => {
            console.error("Redis init error: " + err);
        });
    }
    async get(key){
        return await this.conn.get(key);
    }
    async set(key, value){
        return await this.conn.set(key, value);
    }
    async setEx(key, value, expires){
        return await this.conn.setEx(key, expires, value)
    }
    async del(key){
        return await this.conn.del(key);
    }
}

const RedisConnObject = new RedisConn();

export default async function (ctx, next) {
    ctx.redis = RedisConnObject;
    await next();
}