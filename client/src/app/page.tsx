"use client";
import { useChat } from "ai/react";
import "tailwindcss/tailwind.css";

export default function Home() {
  //useChatの定義
  const {input, messages, handleInputChange, handleSubmit} = useChat();
  return (
    <div className="flex flex-col min-h-screen bg-[url('https://data-dreamers.vercel.app/_next/image?url=%2Fimages%2Fchallenge-lab-01.avif&w=1920&q=75')] bg-cover bg-center">
            {/* ヘッダー */}
            <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-md py-3 px-6">
        <div className="container mx-auto flex justify-between items-center">
          {/* ロゴ + タイトル */}
          <div className="flex items-center space-x-3">
            <img
              src="https://data-dreamers.vercel.app/_next/image?url=%2Fimages%2Ficon-removebg.png&w=128&q=75"
              alt="Logo"
              className="w-12 h-12"
            />
            <h1 className="text-xl font-bold">Data Dreamers ChatBot</h1>
          </div>
        </div>
      </header>
      {/* メッセージエリア */}
      <div className="flex flex-col flex-grow items-center justify-end px-4 pb-20">
        <div className="w-full max-w-2xl flex flex-col h-[75vh] overflow-y-auto space-y-4 p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-[75%] ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-black shadow"
                }`}
              >
                {message.role === "assistant" && (
                  <span className="font-bold text-blue-500">Dreamer</span>
                )}
                <p>{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 入力フォームを画面下に固定 */}
      <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-md py-3 px-6 shadow-md">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 max-w-2xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-grow border border-gray-300 rounded-full p-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="メッセージを入力..."
          />
          <button
            type="submit"
            className="bg-gray-400 text-white p-3 rounded-full hover:bg-gray-700 transition"
          >
            ▷
          </button>
        </form>
      </div>
    </div>
  );
}
