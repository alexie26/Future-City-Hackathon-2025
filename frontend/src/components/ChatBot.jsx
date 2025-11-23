import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, CheckCircle, AlertCircle, XCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import { getTranslation } from '../translations';

const ChatBot = ({ result, onApply, lang = 'en' }) => {
    const t = (key) => getTranslation(lang, key);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    // Generate context-aware initial greeting based on result status
    useEffect(() => {
        if (!result) return;

        const getInitialGreeting = () => {
            const baseGreeting = {
                id: Date.now(),
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            };

            switch (result.status) {
                case 'green':
                    const greenText = result.connection_type === 'feed_in' 
                        ? `Hi! 🎉 Great news! Your ${result.kw_requested}kW **solar feed-in** connection is **feasible**! The grid has sufficient capacity to accept your renewable energy. Your application can be processed quickly!\n\n**Next Steps:** You can submit your application or check out green suggestions to maximize your environmental impact!`
                        : `Hi! 🎉 Great news! Your ${result.kw_requested}kW **power connection** is **feasible**! The grid has sufficient capacity for your consumption needs. Your application can be processed quickly!\n\n**Next Steps:** You can submit your application or check out green suggestions to maximize your environmental impact!`;
                    return {
                        ...baseGreeting,
                        text: greenText,
                        type: 'text',
                        buttons: [
                            { label: t('chat_apply_now'), action: 'apply', icon: CheckCircle },
                            { label: t('chat_green_suggestions'), action: 'show-suggestions', icon: Sparkles }
                        ]
                    };
                
                case 'yellow':
                    const yellowText = result.connection_type === 'feed_in'
                        ? `Hello! ⚠️ Your ${result.kw_requested}kW **solar feed-in** request requires a **detailed review**. The grid has limited capacity to accept additional renewable generation. Expected timeline: ${result.timeline || '2-4 weeks'}. Our team will evaluate grid reinforcement options.`
                        : `Hello! ⚠️ Your ${result.kw_requested}kW **power consumption** request requires a **detailed review**. The grid has limited capacity. Expected timeline: ${result.timeline || '2-4 weeks'}. I recommend submitting an application so our team can evaluate your specific case.`;
                    return {
                        ...baseGreeting,
                        text: yellowText,
                        type: 'text'
                    };
                
                case 'red':
                    const redText = result.connection_type === 'feed_in'
                        ? `Hi there. ⛔ Unfortunately, the grid cannot currently accept ${result.kw_requested}kW of **solar feed-in**. The local grid is at capacity for renewable generation. **Grid expansion** would be needed, which typically takes ${result.timeline || '6-12 months'}. However, there may be alternative solutions!\n\nWould you like me to show you some better alternatives?`
                        : `Hi there. ⛔ Unfortunately, the grid doesn't have sufficient capacity for ${result.kw_requested}kW of **power consumption**. **Grid expansion** would be needed, which typically takes ${result.timeline || '6-12 months'}. However, there may be alternative solutions!\n\nWould you like me to show you some better alternatives?`;
                    return {
                        ...baseGreeting,
                        text: redText,
                        type: 'text',
                        buttons: [{ label: t('chat_show_alternatives'), action: 'show-alternatives', icon: Sparkles }]
                    };
                
                default:
                    return {
                        ...baseGreeting,
                        text: 'Hello! I\'m your Electrify Assistant. I can help guide you through the grid connection application process.',
                        type: 'text'
                    };
            }
        };

        const initialMessages = [getInitialGreeting()];

        setMessages(initialMessages);
    }, [result, lang]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleButtonClick = (action, messageId) => {
        if (action === 'apply') {
            // Remove clicked button and add confirmation + show other button
            setMessages(prev => {
                const updated = prev.map(msg => {
                    if (msg.id === messageId) {
                        // Remove the Apply button, keep Green Suggestions if it exists
                        const remainingButtons = msg.buttons?.filter(btn => btn.action !== 'apply');
                        return { ...msg, buttons: remainingButtons?.length > 0 ? remainingButtons : undefined };
                    }
                    return msg;
                });
                return [...updated, {
                    id: Date.now(),
                    text: t('chat_opening_form'),
                    sender: 'bot',
                    type: 'text',
                    timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                }];
            });
            
            if (onApply) {
                onApply();
            }
        } else if (action === 'details' || action === 'info') {
            const detailsMessage = `📊 **Your Connection Details:**\n\n` +
                `• Status: ${result.status.toUpperCase()}\n` +
                `• Power Requested: ${result.kw_requested}kW\n` +
                `• Voltage Level: ${result.grid_level || 'NS'}\n` +
                `• Distance to Station: ${result.distance_km}km\n` +
                `• Remaining Capacity: ${result.remaining_safe}kW\n` +
                `• Timeline: ${result.timeline || 'Contact for details'}\n` +
                (result.eco_score ? `• Eco Score: ${result.eco_score}/100\n` : '') +
                `\n${result.next_steps || 'Submit your application to proceed!'}`;
            
            // Remove buttons and add details in single update
            setMessages(prev => {
                const updated = prev.map(msg => 
                    msg.id === messageId ? { ...msg, buttons: undefined } : msg
                );
                return [...updated, {
                    id: Date.now(),
                    text: detailsMessage,
                    sender: 'bot',
                    type: 'text',
                    timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                }];
            });
        } else if (action === 'alternatives' || action === 'show-alternatives') {
            const isFeedIn = result.connection_type === 'feed_in';
            const altMessage = isFeedIn
                ? `🔄 **Better Alternative Solutions for Solar Feed-In:**\n\n` +
                  `1. **Reduce System Size:** Scale down to ${Math.floor(result.remaining_safe * 0.8)}kW solar installation to fit available grid capacity\n` +
                  `2. **Battery Storage:** Install battery storage to store excess energy instead of feeding into grid\n` +
                  `3. **Different Location:** Check nearby addresses with better grid capacity for feed-in\n` +
                  `4. **Self-Consumption Focus:** Maximize on-site consumption (EV charging, heat pumps) to reduce feed-in\n` +
                  `5. **Phased Installation:** Start with ${Math.floor(result.remaining_safe * 0.8)}kW now, expand when grid upgrades\n\n` +
                  `💡 I'm here to answer any questions about these solar alternatives! Just type your question below.`
                : `🔄 **Better Alternative Solutions for Power Consumption:**\n\n` +
                  `1. **Reduce Power Demand:** Scale down to ${Math.floor(result.remaining_safe * 0.8)}kW to fit within available capacity\n` +
                  `2. **Different Location:** Try nearby addresses with better grid availability\n` +
                  `3. **Phased Installation:** Start with ${Math.floor(result.remaining_safe * 0.8)}kW now, expand when grid upgrades\n` +
                  `4. **Energy Storage:** Add battery storage to reduce peak grid demand\n` +
                  `5. **Time-of-Use Planning:** Schedule high loads during off-peak hours\n\n` +
                  `💡 I'm here to answer any questions you have about these alternatives! Just type your question below.`;
            
            // Remove buttons and add alternatives in single update
            setMessages(prev => {
                const updated = prev.map(msg => 
                    msg.id === messageId ? { ...msg, buttons: undefined } : msg
                );
                return [...updated, {
                    id: Date.now(),
                    text: altMessage,
                    sender: 'bot',
                    type: 'text',
                    timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                }];
            });
        } else if (action === 'show-suggestions') {
            // Show green recommendations and keep Apply button
            if (result.recommendations && result.recommendations.length > 0) {
                const recsText = result.recommendations.map((rec, idx) => 
                    `${idx + 1}. **${rec.title}**\n   ${rec.description}${rec.savings ? `\n   💰 Savings: ${rec.savings}` : ''}`
                ).join('\n\n');

                setMessages(prev => {
                    const updated = prev.map(msg => {
                        if (msg.id === messageId) {
                            // Remove the Green Suggestions button, keep Apply button if it exists
                            const remainingButtons = msg.buttons?.filter(btn => btn.action !== 'show-suggestions');
                            return { ...msg, buttons: remainingButtons?.length > 0 ? remainingButtons : undefined };
                        }
                        return msg;
                    });
                    return [...updated, {
                        id: Date.now(),
                        text: `🌱 **Green Suggestions to Maximize Your Environmental Impact:**\n\n${recsText}\n\nThese are optional ways to make your connection more sustainable!`,
                        sender: 'bot',
                        type: 'text',
                        timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    }];
                });
            }
        }
    };

    const handleSendMessage = async () => {
        if (inputValue.trim() === '') return;

        const messageText = inputValue;
        setInputValue('');

        // Add user message
        setMessages(prev => [...prev, {
            id: Date.now(),
            text: messageText,
            sender: 'user',
            type: 'text',
            timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        }]);

        // Check for keywords and provide contextual responses
        const lowerMessage = messageText.toLowerCase();
        
        if (lowerMessage.includes('apply') || lowerMessage.includes('application')) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: `I'll help you start the application process! Click the "Apply Now" button below to open the application form with your details pre-filled.`,
                sender: 'bot',
                type: 'text',
                buttons: [{ label: 'Apply Now', action: 'apply', icon: CheckCircle }],
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            }]);
            return;
        }

        if (lowerMessage.includes('timeline') || lowerMessage.includes('how long')) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: `Based on your grid status (${result.status}), the expected timeline is: **${result.timeline || 'Please contact us for specific timeline'}**. This includes application review and connection setup.`,
                sender: 'bot',
                type: 'text',
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            }]);
            return;
        }

        if (lowerMessage.includes('score') || lowerMessage.includes('eco')) {
            const ecoText = result.eco_score 
                ? `Your Eco Score is **${result.eco_score}/100**! ${result.eco_score >= 80 ? '🌟 Excellent! ' : result.eco_score >= 60 ? '✅ Good! ' : '⚠️ '}This reflects the environmental impact and grid efficiency of your connection.`
                : 'Eco score information is not available for this check.';
            
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: ecoText,
                sender: 'bot',
                type: 'text',
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            }]);
            return;
        }

        if (lowerMessage.includes('recommend') || lowerMessage.includes('green') || lowerMessage.includes('eco') || lowerMessage.includes('suggestion')) {
            if (result.recommendations && result.recommendations.length > 0) {
                const recsText = result.recommendations.map((rec, idx) => 
                    `${idx + 1}. **${rec.title}**\n   ${rec.description}${rec.savings ? `\n   💰 Savings: ${rec.savings}` : ''}`
                ).join('\n\n');

                setMessages(prev => [...prev, {
                    id: Date.now(),
                    text: `🌱 **Personalized Green Recommendations:**\n\n${recsText}`,
                    sender: 'bot',
                    type: 'text',
                    timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    text: `I don't have specific green recommendations for your current request, but I can help with other aspects of your grid connection!`,
                    sender: 'bot',
                    type: 'text',
                    timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                }]);
            }
            return;
        }

        if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: `I can help you with:\n\n• Understanding your grid connection results\n• Explaining timeline and next steps\n• Starting your application\n• Providing cost estimates\n• Technical requirements (TAB, VDE)\n• Document preparation\n\nWhat would you like to know more about?`,
                sender: 'bot',
                type: 'text',
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            }]);
            return;
        }

        // Call Gemini-powered backend for other queries
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            
            const history = messages.filter(m => m.type === 'text').map(msg => ({
                text: msg.text,
                sender: msg.sender
            }));

            const response = await axios.post(`${apiUrl}/chat`, {
                message: messageText,
                conversation_history: history,
                grid_context: result // Pass result data for context
            });

            setMessages(prev => [...prev, {
                id: Date.now(),
                text: response.data.response,
                sender: 'bot',
                type: 'text',
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: t('chat_error'),
                sender: 'bot',
                type: 'text',
                timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            }]);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="w-full bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-4 flex items-center gap-3">
                <div className="bg-white bg-opacity-20 rounded-full p-2">
                    <Bot className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-base">Electrify Assistant</h3>
                    <p className="text-xs text-blue-100">Powered by AI - Here to guide you</p>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 max-h-[500px] min-h-[300px]">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`mb-3 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.sender === 'bot' && (
                            <div className="flex items-start gap-2 max-w-full">
                                <div className="bg-blue-100 rounded-full p-2 flex-shrink-0 mt-1">
                                    <Bot className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="bg-white border border-gray-200 rounded-lg rounded-tl-none p-3 text-gray-800 whitespace-pre-line text-sm">
                                        {message.text}
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    {message.buttons && message.buttons.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {message.buttons.map((btn, idx) => {
                                                const Icon = btn.icon;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleButtonClick(btn.action, message.id)}
                                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                                                    >
                                                        {Icon && <Icon className="w-4 h-4" />}
                                                        {btn.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    <p className="text-xs text-gray-500 mt-1 ml-1">{message.timestamp}</p>
                                </div>
                            </div>
                        )}
                        {message.sender === 'user' && (
                            <div className="flex flex-col items-end max-w-[80%]">
                                <div className="bg-blue-600 text-white rounded-lg rounded-tr-none p-3 text-sm">
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
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={t('chat_placeholder')}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={inputValue.trim() === ''}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
                        aria-label={t('chat_send')}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    {t('chat_helper')}
                </p>
            </div>
        </div>
    );
};

export default ChatBot;
