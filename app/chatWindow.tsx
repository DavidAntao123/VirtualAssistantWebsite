"use client"; 

import { useState } from "react";
import { Message } from "./message"; 
export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatId] = useState(
    () => `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  );

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // So pus dentro num try catch para lidar com erros de rede ou streaming
    try {
      const res = await fetch("http://100.116.93.26:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          message: userMessage.content,
        }),
      });

      // Se for null sai logo
      if (!res.body) return;

      // Criar um reader para ler o stream de resposta 
      const reader = res.body.getReader();
      
      //  TextDecoder para decodificar os bytes do stream em texto
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      // Loop enquanto existirem dados paar ler
      while (true) {
        const { value, done } = await reader.read(); 

        if (done) break; //fica done quando o stream acabar

        // Decodifica os bytes
        const text = decoder.decode(value, { stream: true });
        
        const lines = text.split("\n");

        for (const line of lines) {
          //se a linha comecar com "data" é porque é texto 
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {

              const json = JSON.parse(line.replace("data: ", ""));
              
              // Junta o texto todo
              accumulatedContent += json.chunk;

              // Atualiza a última mensagem do assistente com o conteúdo acumulado
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                newMessages[lastIndex] = {
                  role: "assistant",
                  content: accumulatedContent,
                };
                return newMessages;
              });
            } catch (e) {
              console.error("JSON parse error:", e);
            }
          }
        }
      }

    } catch (err) {
      console.error("Stream error:", err);
    }
  };


  const recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
  const synth = window.speechSynthesis;
  // Set the language
  recognition.lang = "en-US";

  // Event listener for when speech is recognized
  recognition.onresult = (event: { results: { transcript: any }[][] }) => {
    const transcript = event.results[0][0].transcript;
    setInput(transcript);
    console.log("You said: ", transcript);
  };
  // Event listener for when the recognition ends
  recognition.onend = () => {
    console.log("Recognition ended.");
  };

  recognition.onerror = (event: { error: any }) => {
   // console.error("Speech recognition error:", event.error);
  };

  function handleVoice(): void {
    // Create a new SpeechRecognition object

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        recognition.start();
      })
      .catch((error) => {
        console.error("Microphone permission denied:", error);
      });
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px" }}>
      {}
      <div style={{ border: "1px solid #ccc", padding: 12, minHeight: 300, marginBottom: 12, borderRadius: "8px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            {}
            <strong>{msg.role === "user" ? "You" : "Bot"}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 8, borderRadius: "4px", border: "1px solid #ddd" }}
        />
        <button onClick={sendMessage} style={{ padding: "8px 16px" }}>Send</button>
        <button onClick={handleVoice} style={{ padding: "8px 16px" }}>Say</button>
      </div>
    </div>
  );
}