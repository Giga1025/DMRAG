'use client'

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'player' | 'dm';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'dm',
      content: "Welcome, brave adventurer! You find yourself at the entrance of a mysterious dungeon. Ancient runes glow faintly on the stone archway, and you can hear distant echoes from within. What do you choose to do?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const playerMessage: Message = {
      id: Date.now().toString(),
      type: 'player',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, playerMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response (replace with actual AI call later)
    setTimeout(() => {
      const dmResponses = [
        "The shadows seem to whisper your name as you step forward. Roll for perception!",
        "A goblin jumps out from behind a rock! What's your next move?",
        "You discover a glimmering treasure chest. It could be trapped... do you investigate?",
        "The ancient door creaks open, revealing a chamber filled with mysterious fog.",
        "A wise old wizard appears before you, offering a cryptic riddle.",
        "Your torch flickers as a cold wind blows through the corridor ahead."
      ];

      const dmMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'dm',
        content: dmResponses[Math.floor(Math.random() * dmResponses.length)],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, dmMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chatPage">
      <div className="chatHeader">
        <div className="headerContent">
          <h1>🐉 Dungeon Master&apos;s Table</h1>
        </div>
      </div>

      <div className="chatContainer">
        <div className="messagesArea">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="messageAvatar">
                {message.type === 'dm' ? '🎲' : '⚔️'}
              </div>
              <div className="messageContent">
                <div className="messageHeader">
                  <span className="messageSender">
                    {message.type === 'dm' ? 'Dungeon Master' : 'You'}
                  </span>
                  <span className="messageTime">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="messageText">{message.content}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message dm">
              <div className="messageAvatar">🎲</div>
              <div className="messageContent">
                <div className="messageHeader">
                  <span className="messageSender">Dungeon Master</span>
                </div>
                <div className="typingIndicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="inputArea">
          <div className="inputContainer">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your action or ask the DM a question..."
              className="messageInput"
              rows={3}
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage}
              className="sendButton"
              disabled={!inputMessage.trim() || isLoading}
            >
              <span>⚡</span>
            </button>
          </div>
          <div className="inputHint">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
} 