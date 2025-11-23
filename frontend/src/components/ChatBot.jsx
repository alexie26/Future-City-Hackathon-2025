import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Bot, Send } from 'lucide-react';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    // Initial welcome message when component mounts
    useEffect(() => {
        setMessages([
            {
                id: 1,
                text: 'Hello! I\'m your Electrify Assistant. I can help guide you through the grid connection application process. How can I assist you today?',
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            }
        ]);
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleSendMessage = () => {
        if (inputValue.trim() === '') return;

        const messageText = inputValue;
        setInputValue('');

        // Add user message using functional updater
        setMessages(prev => {
            const newMessage = {
                id: Date.now(),
                text: messageText,
                sender: 'user',
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            };
            return [...prev, newMessage];
        });

        // Bot response (placeholder for now)
        setTimeout(() => {
            setMessages(prev => {
                const botResponse = {
                    id: Date.now(),
                    text: 'Thank you for your message. I\'m here to help you with the application process!',
                    sender: 'bot',
                    timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                };
                return [...prev, botResponse];
            });
        }, 500);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {/* Toggle Button (visible when chat is closed) */}
            {!isOpen && (
                <button
                    onClick={handleToggle}
                    className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-[6000]"
                    aria-label="Open chat"
                >
                    <MessageCircle className="w-8 h-8" />
                </button>
            )}

            {/* Chat Window (visible when isOpen is true) */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-[6000] flex flex-col animate-in slide-in-from-bottom duration-300">
                    {/* Chat Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bot className="w-6 h-6" />
                            <div>
                                <h3 className="font-bold text-lg">Electrify Assistant</h3>
                                <p className="text-xs text-blue-100">Here to help you</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggle}
                            className="hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                            aria-label="Close chat"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`mb-3 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.sender === 'bot' && (
                                    <div className="flex items-start gap-2 max-w-[80%]">
                                        <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                                            <Bot className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="bg-white border border-gray-200 rounded-lg rounded-tl-none p-3 text-gray-800">
                                                {message.text}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 ml-1">{message.timestamp}</p>
                                        </div>
                                    </div>
                                )}
                                {message.sender === 'user' && (
                                    <div className="flex flex-col items-end max-w-[80%]">
                                        <div className="bg-blue-600 text-white rounded-lg rounded-tr-none p-3">
                                            {message.text}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 mr-1">{message.timestamp}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Area */}
                    <div className="bg-white border-t border-gray-200 p-4 rounded-b-2xl">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={inputValue.trim() === ''}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
                                aria-label="Send message"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatBot;
