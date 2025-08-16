import { CheckLogin } from "../utils/checkLogin";

//你可以随意在这里加多个函数，每个函数都是一个API接口。
//在router.js里注册这个函数，然后给他分配一个URL即可。

export async function TestApi(ctx) {
    const userSession = await CheckLogin(ctx);
    if (!userSession) {
        return;
    }

    let data = {
        somedata: "This is a test API",
    }

    //返回的数据也是一个JSON对象
    ctx.body = {
        status: 1, //status字段是必须的，1-成功，2-显示错误信息，4-失败并立即注销
        message: "OK", //如果status返回2或4，那么message字段是必须的，用于显示错误信息
        data
    };
    ctx.status = 200;
    return;
}