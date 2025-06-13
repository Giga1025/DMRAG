'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { modelApi, campaignsApi } from '@/lib/data';

interface Message {
  id: string;
  type: 'player' | 'dm';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams?.get('campaign');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load campaign data when component mounts or campaign ID changes
  useEffect(() => {
    const loadCampaign = async () => {
      if (!campaignId) {
        // No campaign specified, use default welcome message
        setMessages([
          {
            id: '1',
            type: 'dm',
            content: "Welcome, brave adventurer! You find yourself at the entrance of a mysterious dungeon. Ancient runes glow faintly on the stone archway, and you can hear distant echoes from within. What do you choose to do?",
            timestamp: new Date()
          }
        ]);
        setCampaignLoading(false);
        return;
      }

      try {
        setCampaignLoading(true);
        const campaignData = await campaignsApi.getCampaign(campaignId);
        
        setCampaign(campaignData);
        
        // Convert stored chat history to message format
        const chatHistory = campaignData.chat_history || [];
        const formattedMessages = chatHistory.map((msg: any, index: number) => ({
          id: `${index + 1}`,
          type: (msg.role === 'user' ? 'player' : 'dm') as 'player' | 'dm',
          content: msg.content,
          timestamp: new Date(msg.timestamp || Date.now())
        }));
        
                  setMessages(formattedMessages.length > 0 ? formattedMessages : [
            {
              id: '1',
              type: 'dm',
              content: campaignData.initial_message || `Welcome back to "${campaignData.campaign_title}"! Continue your adventure...`,
              timestamp: new Date()
            }
          ]);
      } catch (error) {
        console.error('Error loading campaign:', error);
        router.push('/dashboard'); // Redirect on error
      } finally {
        setCampaignLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, router]);

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

    // Save player message to campaign if we have one
    if (campaignId && campaign) {
      try {
        await campaignsApi.addChatMessage(campaignId, {
          role: 'user',
          content: inputMessage,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save player message:', error);
      }
    }

    try {
      // Send only the latest user input
      const apiResponse = await modelApi.generateResponse(inputMessage, campaignId || undefined);

      const dmMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'dm',
        content: apiResponse.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, dmMessage]);

      // Save DM message to campaign if we have one
      if (campaignId && campaign) {
        try {
          await campaignsApi.addChatMessage(campaignId, {
            role: 'assistant',
            content: apiResponse.response,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Failed to save DM message:', error);
        }
      }
    } catch (error) {
      console.error('Failed to generate response', error);
      const dmMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'dm',
        content: 'The Dungeon Master is momentarily speechless. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, dmMessage]);

      // Save error message to campaign if we have one
      if (campaignId && campaign) {
        try {
          await campaignsApi.addChatMessage(campaignId, {
            role: 'assistant',
            content: 'The Dungeon Master is momentarily speechless. Please try again.',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Failed to save error message:', error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (campaignLoading) {
    return (
      <div className="chatPage">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-lg text-gray-600">Loading campaign...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chatPage">
      <div className="chatHeader">
        <div className="headerContent">
          <h1>🐉 {campaign ? campaign.campaign_title : "Dungeon Master's Table"}</h1>
          {campaign && (
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>Campaign ID: {campaign.id.slice(0, 8)}...</span>
              <button 
                onClick={() => router.push('/dashboard')}
                className="text-purple-600 hover:text-purple-800 underline"
              >
                ← Back to Dashboard
              </button>
            </div>
          )}
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