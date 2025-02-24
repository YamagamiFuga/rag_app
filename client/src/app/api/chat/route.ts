import { openai } from "@ai-sdk/openai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { streamText } from "ai";
import { OpenAI } from "openai";

//環境変数呼び込み
const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY,
} = process.env;

//openaiの呼び出し
const openAIClient = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

//ASTRADBに接続するための処理
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
    //

    //今までの質問の履歴を受け取る
    const { messages } = await req.json();
    //最後の質問が格納される
    const latestMessage = messages[messages.length - 1]?.content;

    //ASTRADBから類似した文字列を格納する箱
    let docContext ="";

    //最後に送られた質問文をベクトル化
    const embeddings = await openAIClient.embeddings.create({
        model: "text-embedding-3-small",
        input: latestMessage,
        encoding_format: "float",
    });
    console.log("✅ Latest Message:", latestMessage);

    //DBに接続する処理
    const collection = db.collection(ASTRA_DB_COLLECTION!);
    //類似したデータを取得
    const cursor = collection.find({}, {
        //DBに入っているベクトル化したデータと質問をベクトル化したものと近いものを10個とってくる
        sort: {
            $vector: embeddings.data[0].embedding,
        },
        limit: 10,  //データを持ってくる個数
    }
    );
    //取得した全てのデータを格納
    const documents = await cursor.toArray();

    //文字列として連結させる
    for await (const document of documents) {
        docContext +=document.text + " ";
    }

    //ChatGPTのプロンプト記述
    const template = {
        role: "system",
        content: `
        あなたは金沢工業大学にある夢考房プロジェクトの「DataDreamers」についての質問を回答するDataDreamers専用のチャットボットです。
        コンテキストで受け取った情報をもとに、DataDreamersについて質問を答えることができます。
        これらのコンテキストはDataDreamers公式サイトのページから抽出されました。
        もしない情報がある場合はあなたの情報は使わないください。
        レスポンスには画像を使わないでください。
        ------------------
        ${docContext}
        ------------------
        Questions: ${latestMessage}
        `,
    };
    //ChatGPTの処理
    const result = await streamText({
        model: openai("gpt-3.5-turbo"), //モデル
        prompt: template.content,   //プロンプト
    });
    
    return result.toDataStreamResponse();
}