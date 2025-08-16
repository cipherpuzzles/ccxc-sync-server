import { CheckLogin } from "../utils/checkLogin";
import { ldb } from "../utils/leveldb";


async function getAllKeys() {
    return await ldb.getAllDocNames();
}

async function deleteDoc(docName) {
    await ldb.clearDocument(docName);
}

export async function getAllDocs(ctx) {
    const userSession = await CheckLogin(ctx, true);
    if (!userSession) {
        return;
    }

    ctx.body = {
        status: 1,
        data: {
            docs: await getAllKeys()
        }
    };
    ctx.status = 200;
}

export async function deleteDocByName(ctx) {
    const userSession = await CheckLogin(ctx, true);
    if (!userSession) {
        return;
    }

    const docName = ctx.jsonRequest.docName;
    if (!docName) {
        ctx.body = {
            status: 2,
            message: "Missing docName parameter."
        };
        ctx.status = 400;
        return;
    }

    try {
        await deleteDoc(docName);
        ctx.body = {
            status: 1,
            message: "Document deleted successfully."
        };
        ctx.status = 200;
    } catch (error) {
        ctx.body = {
            status: 4,
            message: "Failed to delete document."
        };
        ctx.status = 500;
    }
}

export async function deleteAllDocs(ctx) {
    const userSession = await CheckLogin(ctx, true);
    if (!userSession) {
        return;
    }

    try {
        const docs = await getAllKeys();
        for (const docName of docs) {
            await deleteDoc(docName);
        }
        ctx.body = {
            status: 1,
            message: "All documents deleted successfully."
        };
        ctx.status = 200;
    } catch (error) {
        ctx.body = {
            status: 4,
            message: "Failed to delete all documents."
        };
        ctx.status = 500;
    }
}