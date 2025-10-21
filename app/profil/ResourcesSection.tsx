
'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ResourcesSection() {
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Types de sujets pour le support
  const supportTopics = [
    { value: 'technical', label: 'Problème technique', icon: 'ri-tools-line' },
    { value: 'dossier', label: 'Question sur un dossier', icon: 'ri-folder-line' },
    { value: 'commission', label: 'Question sur les commissions', icon: 'ri-money-euro-circle-line' },
    { value: 'account', label: 'Problème de compte', icon: 'ri-user-line' },
    { value: 'feature', label: 'Demande de fonctionnalité', icon: 'ri-lightbulb-line' },
    { value: 'other', label: 'Autre', icon: 'ri-question-line' }
  ];

  // Envoyer le message de contact
  const handleContactSubmit = async () => {
    if (!contactForm.subject || !contactForm.message.trim()) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires' });
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      // TODO: SUPABASE - Envoyer le message via Edge Function ou API
      // const { error } = await supabase.functions.invoke('send-support-message', {
      //   body: {
      //     subject: contactForm.subject,
      //     message: contactForm.message,
      //     priority: contactForm.priority,
      //     user_id: userData.id
      //   }
      // });
      // 
      // if (error) throw error;

      // Simulation de l'envoi
      await new Promise(resolve => setTimeout(resolve, 1500));

      setMessage({ type: 'success', text: 'Votre message a été envoyé avec succès. Notre équipe vous répondra dans les plus brefs délais.' });
      setContactForm({ subject: '', message: '', priority: 'normal' });
      setShowContactForm(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'envoi du message. Veuillez réessayer.' });
    } finally {
      setIsSending(false);
    }
  };

  // Masquer le message après 5 secondes
  useState(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  });

  return (
    <div className="space-y-6">
      {/* Message de notification */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-400'
        }`}>
          <i className={`${message.type === 'success' ? 'ri-check-circle-line' : 'ri-error-warning-line'} text-lg`}></i>
          <span className="font-medium">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Support et Contact */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="ri-customer-service-line text-[#335FAD] dark:text-[#335FAD]/80 text-xl"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Support et Contact
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Besoin d'aide ? Notre équipe est là pour vous accompagner
              </p>
            </div>
          </div>
          
          {!showContactForm && (
            <div className="flex justify-end sm:justify-start">
              <button
                onClick={() => setShowContactForm(true)}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-mail-line"></i>
                <span>Contacter le support</span>
              </button>
            </div>
          )}
        </div>

        {/* Informations de contact rapide */}
        {!showContactForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <i className="ri-phone-line text-green-600 dark:text-green-400"></i>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Téléphone</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">01 23 45 67 89</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Lun-Ven 9h-18h</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="w-8 h-8 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <i className="ri-mail-line text-[#335FAD] dark:text-[#335FAD]"></i>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">support@gmb-courtage.fr</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Réponse sous 24h</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                <i className="ri-chat-3-line text-purple-600 dark:text-purple-400"></i>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Chat en ligne</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Disponible</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Lun-Ven 9h-17h</p>
            </div>
          </div>
        )}

        {/* Formulaire de contact */}
        {showContactForm && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sujet de votre demande <span className="text-red-500">*</span>
              </label>
              <Select
                value={contactForm.subject}
                onValueChange={(v) => setContactForm(prev => ({ ...prev, subject: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez un sujet" />
                </SelectTrigger>
                <SelectContent>
                  {supportTopics.map(topic => (
                    <SelectItem key={topic.value} value={topic.value}>
                      {topic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Priorité
              </label>
              <div className="flex space-x-4">
                {[
                  { value: 'low', label: 'Faible', color: 'text-green-600 dark:text-green-400' },
                  { value: 'normal', label: 'Normale', color: 'text-[#335FAD] dark:text-[#335FAD]' },
                  { value: 'high', label: 'Élevée', color: 'text-orange-600 dark:text-orange-400' },
                  { value: 'urgent', label: 'Urgente', color: 'text-red-600 dark:text-red-400' }
                ].map(priority => (
                  <label key={priority.value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={contactForm.priority === priority.value}
                      onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="mr-2 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`text-sm font-medium ${priority.color}`}>
                      {priority.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Votre message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Décrivez votre demande en détail..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Minimum 10 caractères - {contactForm.message.length}/500
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowContactForm(false);
                  setContactForm({ subject: '', message: '', priority: 'normal' });
                }}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleContactSubmit}
                disabled={isSending || !contactForm.subject || contactForm.message.trim().length < 10}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-line"></i>
                    <span>Envoyer le message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Informations légales rapides */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
          <i className="ri-shield-check-line mr-2 text-gray-600 dark:text-gray-400"></i>
          Informations légales
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">GMB Courtage</p>
            <p className="text-gray-600 dark:text-gray-400">
              Société de courtage en assurance<br />
              ORIAS N° 12345678<br />
              Capital social : 50 000 €
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Siège social</p>
            <p className="text-gray-600 dark:text-gray-400">
              123 Avenue de la République<br />
              75001 Paris, France<br />
              SIRET : 123 456 789 00012
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Liens utiles</p>
            <div className="space-y-1">
              <button className="block text-[#335FAD] dark:text-[#335FAD]/80 hover:text-[#335FAD]/70 dark:hover:text-[#335FAD]/90 cursor-pointer">
                Mentions légales
              </button>
              <button className="block text-[#335FAD] dark:text-[#335FAD]/80 hover:text-[#335FAD]/70 dark:hover:text-[#335FAD]/90 cursor-pointer">
                Politique de confidentialité
              </button>
              <button className="block text-[#335FAD] dark:text-[#335FAD]/80 hover:text-[#335FAD]/70 dark:hover:text-[#335FAD]/90 cursor-pointer">
                Politique des cookies
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
