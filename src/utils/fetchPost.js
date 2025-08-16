import Config from '../config';

const API_ROOT = Config.apiRoot;

export async function fetchPost(url, data) {
    let api = API_ROOT + url;
    let dataBody = JSON.stringify(data);

    try {
        return await fetch(api, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: dataBody
        });
    } catch (err) {
        throw err;
    }
}