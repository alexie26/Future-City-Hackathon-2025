import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, CheckCircle, AlertCircle, XCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import RecommendationCard from './RecommendationCard';

const ChatBot = ({ result, onApply, lang = 'en' }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [showRecommendations, setShowRecommendations] = useState(false);
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
                    return {
                        ...baseGreeting,
                        text: lang === 'de' 
                            ? `Hallo! 🎉 Gute Nachrichten! Ihr Netzanschluss für ${result.kw_requested}kW ist **machbar**. Die Kapazität ist verfügbar und Ihr Antrag kann schnell bearbeitet werden!`
                            : `Hi! 🎉 Great news! Your grid connection for ${result.kw_requested}kW is **feasible**. The capacity is available and your application can be processed quickly!`,
                        type: 'text'
                    };
                
                case 'yellow':
                    return {
                        ...baseGreeting,
                        text: lang === 'de'
                            ? `Hallo! ⚠️ Ihre Anfrage für ${result.kw_requested}kW erfordert eine **detaillierte Prüfung**. Das Netz hat begrenzte Kapazität. Voraussichtliche Zeitachse: ${result.timeline || '2-4 Wochen'}. Ich empfehle, einen Antrag einzureichen, damit unser Team Ihren spezifischen Fall bewerten kann.`
                            : `Hello! ⚠️ Your request for ${result.kw_requested}kW requires a **detailed review**. The grid has limited capacity. Expected timeline: ${result.timeline || '2-4 weeks'}. I recommend submitting an application so our team can evaluate your specific case.`,
                        type: 'text'
                    };
                
                case 'red':
                    return {
                        ...baseGreeting,
                        text: lang === 'de'
                            ? `Hallo. ⛔ Leider hat das Netz keine ausreichende Kapazität für ${result.kw_requested}kW. Eine **Netzerweiterung** wäre erforderlich, die normalerweise ${result.timeline || '6-12 Monate'} dauert. Es könnte jedoch alternative Lösungen geben!`
                            : `Hi there. ⛔ Unfortunately, the grid doesn't have sufficient capacity for ${result.kw_requested}kW. **Grid expansion** would be needed, which typically takes ${result.timeline || '6-12 months'}. However, there may be alternative solutions!`,
                        type: 'text'
                    };
                
                default:
                    return {
                        ...baseGreeting,
                        text: lang === 'de'
                            ? 'Hallo! Ich bin Ihr Electrify-Assistent. Ich kann Sie durch den Netzanschluss-Antragsprozess führen.'
                            : 'Hello! I\'m your Electrify Assistant. I can help guide you through the grid connection application process.',
                        type: 'text'
                    };
            }
        };

        const initialMessages = [getInitialGreeting()];

        setMessages(initialMessages);
    }, [result]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleButtonClick = (action, messageId) => {
        if (action === 'apply') {
            // Remove buttons and add confirmation in single update
            setMessages(prev => {
                const updated = prev.map(msg => 
                    msg.id === messageId ? { ...msg, buttons: undefined } : msg
                );
                return [...updated, {
                    id: Date.now(),
                    text: '✅ Opening application form for you!',
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
        } else if (action === 'alternatives') {
            const altMessage = `🔄 **Alternative Options:**\n\n` +
                `1. **Reduce Power:** Consider scaling down your installation to fit available capacity\n` +
                `2. **Different Location:** Check nearby addresses with better grid capacity\n` +
                `3. **Phased Installation:** Start with partial capacity now, expand later\n` +
                `4. **Grid Expansion:** Apply for connection and participate in grid upgrade costs\n\n` +
                `Would you like to submit an application to discuss these options with our team?`;
            
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
                    buttons: [{ label: 'Yes, Apply Now', action: 'apply', icon: CheckCircle }],
                    timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                }];
            });
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
                grid_context: result, // Pass result data for context
                lang: lang // Pass current language
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
                text: 'Sorry, I encountered an error. Please try again or use the quick action buttons above.',
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

            {/* Application Button - Only shown when status is green */}
            {result.status === 'green' && onApply && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-t border-green-200 p-4">
                    <button
                        onClick={onApply}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 mb-3"
                    >
                        <CheckCircle className="w-5 h-5" />
                        {lang === 'de' ? 'Verbindung beantragen' : 'Apply for Connection'}
                    </button>
                    
                    {/* Green Recommendations Toggle Button */}
                    {result.recommendations && result.recommendations.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowRecommendations(!showRecommendations)}
                                className="w-full bg-white hover:bg-green-50 text-green-700 font-medium py-2.5 rounded-lg transition-colors border-2 border-green-300 flex items-center justify-center gap-2"
                            >
                                🌱 {lang === 'de' ? 'Grüne Empfehlungen anzeigen' : 'Show Green Recommendations'}
                            </button>
                            
                            {/* Recommendations Display */}
                            {showRecommendations && (
                                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                    {result.recommendations.map((rec, idx) => (
                                        <RecommendationCard key={idx} recommendation={rec} lang={lang} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    
                    <p className="text-xs text-center text-gray-600 mt-2">
                        {lang === 'de' 
                            ? '✅ Ihre Verbindung ist machbar! Reichen Sie jetzt Ihren Antrag ein.' 
                            : '✅ Your connection is feasible! Submit your application now.'}
                    </p>
                </div>
            )}

            {/* Chat Input Area */}
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={lang === 'de' ? 'Frag mich etwas...' : 'Ask me anything...'}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                <p className="text-xs text-gray-500 mt-2 text-center">
                    {lang === 'de' 
                        ? 'Fragen Sie nach Zeitplan, Kosten, Dokumenten oder nächsten Schritten' 
                        : 'Ask about timeline, costs, documents, or next steps'}
                </p>
            </div>
        </div>
    );
};

export default ChatBot;
