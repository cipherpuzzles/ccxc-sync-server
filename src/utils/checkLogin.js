import { HmacSha1 } from '../utils/cryptTools';

export async function CheckLogin(ctx, adminOnly = false) {
    //从Header中取出User-Token和X-Auth-Token用于用户身份验证
    let userToken = ctx.headers["user-token"];
    let xAuthToken = ctx.headers["x-auth-token"];
    //X-Auth-Token结构为三段 Ccxc-Auth ${timestamp} ${sign}，分别取出这三段验证
    let xAuthTokenArray = xAuthToken.split(" ");
    if (xAuthTokenArray.length !== 3) {
        BadResponse(ctx, 4, "Invalid request. (X-Auth-Token)")
        return null;
    }
    let ccxcAuthSignMagicString = xAuthTokenArray[0];
    if (ccxcAuthSignMagicString !== "Ccxc-Auth") {
        BadResponse(ctx, 4, "Invalid request. (Ccxc-Auth)")
        return null;
    }
    let timestamp = xAuthTokenArray[1];
    let sign = xAuthTokenArray[2];

    //验证时间戳，当前时间与时间戳相差不得超过5分钟
    let now = Date.now();
    if (now - timestamp > 5 * 60 * 1000) {
        BadResponse(ctx, 4, "Invalid request. (Timestamp)")
        return null;
    }

    //从Redis中取出用户信息
    let userTokenKey = `ccxc:usersession:${userToken}`;
    let userTokenValue = await ctx.redis.get(userTokenKey);
    if (!userTokenValue) {
        BadResponse(ctx, 4, "Invalid request. (User-Token)")
        return null;
    }

    let userSession = JSON.parse(userTokenValue);
    if (userSession.is_active !== 1) {
        BadResponse(ctx, 4, "Invalid request. (not active)")
        return null;
    }

    //验证签名
    let sk = userSession.sk;
    let bodyString = "";
    if (ctx.fullBodyString) {
        bodyString = ctx.fullBodyString;
    }
    let signString = `token=${userToken}&ts=${timestamp}&bodyString=${bodyString}`;
    //hmacSha1签名
    let calcedSign = HmacSha1(signString, sk);
    if (calcedSign !== sign) {
        BadResponse(ctx, 4, "Invalid request. (Sign)")
        return null;
    }

    //判断用户是否已组队
    if (userSession.roleid < 2) {
        BadResponse(ctx, 4, "Invalid request. (not in team)")
        return null;
    }

    //如果是管理员接口，检查用户是否为管理员
    if (adminOnly && userSession.roleid < 4) {
        BadResponse(ctx, 4, "Invalid request. (not admin)")
        return null;
    }

    return userSession;
}

function BadResponse(ctx, code, message) {
    ctx.body = {
        status: code,
        message: message
    };
    ctx.status = 400;
    return;
}