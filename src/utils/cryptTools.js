import crypto from 'crypto';

export function getRandomToken(){
    return crypto.createHash('sha1')
        .update(Date.now().toString() + (1e14 + 2e14 * Math.random()).toString())
        .digest()
        .toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_');
}

export function HmacSha1(data, sk) {
    return crypto.createHmac('sha1', sk)
        .update(data)
        .digest()
        .toString('base64')
}