import { Page, Browser, PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import dotenv from "dotenv";
import { OpenAI } from "openai"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { DataAPIClient } from "@datastax/astra-db-ts";


dotenv.config();


const projectData = [
    "https://data-dreamers.vercel.app/about",
    "https://data-dreamers.vercel.app/for-new-dreamers",
    "https://data-dreamers.vercel.app/news",
    "https://ds100.jp/future/s-017/",
    "https://kyodonewsprwire.jp/release/202312204590"
];


const scrapePage = async () => {
    //スクレイピングを行う関数

    const pageData = [];    //ページから取得した文字列を格納

    for await (const url of projectData) {
        const loader = new PuppeteerWebBaseLoader(url, {
            //スクレイピングツール
            launchOptions: {
                headless: true
            },
            gotoOptions: {
                waitUntil: "domcontentloaded",
            },

            //サイトで行うことを記述=>今回はpage情報を取得
            evaluate: async (page: Page, browser: Browser) => {
                const result = await page.evaluate(() => document.body.innerHTML);  //訪れたpageの情報を取得
                await browser.close();
                return result;
            },
        });
        //
        const data = await loader.scrape(); //スクレイプをかける
        pageData.push(data);
    }

    return pageData;
};

//環境変数呼び込み
const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY,
} = process.env;

//openaiの呼び出し
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

//文章をいい感じに区切ってくれるやつ
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512, //1ブロックで分割する最大文字数
    chunkOverlap: 100,  //前ブロックの100字を含める
});

//ASTRADBに接続するための処理
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE }); 

//ベクトル化したものをDBに格納する関数
const converVectorAndSave = async (pageData: string[]) => {
    //ベクトル化したものをDBに格納する関数

    for (const page of pageData) {
        //いい感じに文章を区切る
        const pageChunks = await splitter.splitText(page);
        //テーブル作成
        const collection = await db.collection(ASTRA_DB_COLLECTION!);

        //区切られた文章を1つずつ取り出してベクトル化
        for await (const chunk of pageChunks) {
            const embedding = await openai.embeddings.create({
                model: "text-embedding-3-small",    //使用モデル
                input: chunk,   //対象
                encoding_format: "float",   //変換後の型　   
            });

            //ベクトル化した値を取り出してvectorに格納
            const vector = embedding.data[0].embedding;

            //DBにデータを格納する処理
            await collection.insertOne({
                $vector: vector,    //ベクトル
                text: chunk,    //元テキスト
            });
        }
    }
};


const createCllection = async () => {
//テーブルを作成する関数

    const res = await db.createCollection(ASTRA_DB_COLLECTION!, {
        //vectorの設定
        vector: {
            dimension: 1536,    //1つのベクトルの長さ定義
            metric: "cosine",   //コサイン類似度を測る方法の定義
        },
    });

    console.log(res);
};

const main = async () => {
//main関数処理

    //1．テーブル作成
    await createCllection();
    //2．スクレイピング処理
    const pageData = await scrapePage();
    //3．スクレイピングされたデータを保存
    await converVectorAndSave(pageData);
};

main();