import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Send, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';

const ApplicationModal = ({ isOpen, onClose, initialData, lang = 'en' }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        comments: '',
        ...initialData
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await axios.post(`${apiUrl}/submit-application`, {
                ...formData,
                kw_requested: initialData.kw,
                type: initialData.type,
                address: initialData.address
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 3000);
        } catch (err) {
            setError('Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-green-600 p-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {lang === 'de' ? 'Netzanschluss-Antrag' : 'Grid Connection Application'}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">
                                {lang === 'de' ? 'Antrag gesendet!' : 'Application Sent!'}
                            </h3>
                            <p className="text-gray-600">
                                {lang === 'de' 
                                    ? 'Wir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.' 
                                    : 'We have received your request and will contact you shortly.'}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Project Summary */}
                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-4">
                                <p><span className="font-semibold">Address:</span> {initialData?.address || 'N/A'}</p>
                                <p><span className="font-semibold">Power:</span> {initialData?.kw || 0} kW ({initialData?.type || 'N/A'})</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {lang === 'de' ? 'Vollständiger Name' : 'Full Name'}
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={lang === 'de' ? 'Max Mustermann' : 'John Doe'}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {lang === 'de' ? 'E-Mail' : 'Email'}
                                    </label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {lang === 'de' ? 'Telefon' : 'Phone'}
                                    </label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+49 123..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {lang === 'de' ? 'Kommentare (Optional)' : 'Comments (Optional)'}
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none h-24 resize-none"
                                    value={formData.comments}
                                    onChange={e => setFormData({ ...formData, comments: e.target.value })}
                                    placeholder={lang === 'de' 
                                        ? 'Spezifische Details zu Ihrem Projekt...' 
                                        : 'Any specific details about your project...'}
                                />
                            </div>

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {lang === 'de' ? 'Wird gesendet...' : 'Sending...'}
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        {lang === 'de' ? 'Antrag einreichen' : 'Submit Application'}
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ApplicationModal;
