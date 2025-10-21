
'use client';

import { useState } from 'react';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
  companyName?: string;
  email: string;
  phone: string;
}

interface ProfileInfoProps {
  userData: UserData;
  onSave: (data: Partial<UserData>) => Promise<{ success: boolean; error?: string }>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export default function ProfileInfo({ userData, onSave, onChangePassword }: ProfileInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulaire des informations de base
  const [formData, setFormData] = useState({
    companyName: userData.companyName || '',
    email: userData.email,
    phone: userData.phone
  });

  // Formulaire de changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Validation du formulaire principal
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'L\'email est obligatoire';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format d\'email invalide';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Le téléphone est obligatoire';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validation du formulaire de mot de passe
  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Le mot de passe actuel est obligatoire';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'Le nouveau mot de passe est obligatoire';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Veuillez confirmer le nouveau mot de passe';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Sauvegarder les informations
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setMessage(null);

    try {
      const result = await onSave(formData);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Informations mises à jour avec succès' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  // Changer le mot de passe
  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return;

    setIsChangingPassword(true);
    setMessage(null);

    try {
      const result = await onChangePassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Mot de passe modifié avec succès' });
        setShowPasswordForm(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors du changement de mot de passe' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Annuler l'édition
  const handleCancel = () => {
    setFormData({
      companyName: userData.companyName || '',
      email: userData.email,
      phone: userData.phone
    });
    setFormErrors({});
    setIsEditing(false);
    setMessage(null);
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

      {/* Informations principales */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="ri-user-line text-[#335FAD] dark:text-[#335FAD]/80 text-xl"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Informations du Profil
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gérez vos informations personnelles et professionnelles
              </p>
            </div>
          </div>
          
          {!isEditing && (
            <div className="flex justify-end sm:justify-start">
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#335FAD]/10 dark:bg-[#335FAD]/20 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD]/80 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-edit-line"></i>
                <span>Modifier</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Nom et Prénom - Non modifiables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prénom
              </label>
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white">
                {userData.firstName}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Non modifiable
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nom
              </label>
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white">
                {userData.lastName}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Non modifiable
              </p>
            </div>
          </div>

          {/* Nom de la société - Modifiable */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nom de la Société
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Nom de votre entreprise"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm ${
                  formErrors.companyName 
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              />
            ) : (
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white">
                {userData.companyName || 'Non renseigné'}
              </div>
            )}
            {formErrors.companyName && (
              <p className="text-red-600 dark:text-red-400 text-xs flex items-center">
                <i className="ri-error-warning-line mr-1"></i>
                {formErrors.companyName}
              </p>
            )}
          </div>

          {/* Email - Modifiable avec confirmation */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Adresse Email <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="votre@email.com"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm ${
                  formErrors.email 
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              />
            ) : (
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white">
                {userData.email}
              </div>
            )}
            {formErrors.email && (
              <p className="text-red-600 dark:text-red-400 text-xs flex items-center">
                <i className="ri-error-warning-line mr-1"></i>
                {formErrors.email}
              </p>
            )}
            {isEditing && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center">
                <i className="ri-information-line mr-1"></i>
                Un email de confirmation sera envoyé en cas de modification
              </p>
            )}
          </div>

          {/* Téléphone - Modifiable */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Numéro de Téléphone <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="06 12 34 56 78"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm ${
                  formErrors.phone 
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-3 00 dark:border-gray-600 bg-white dark:bg-gray-800'
                } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              />
            ) : (
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white">
                {userData.phone}
              </div>
            )}
            {formErrors.phone && (
              <p className="text-red-600 dark:text-red-400 text-xs flex items-center">
                <i className="ri-error-warning-line mr-1"></i>
                {formErrors.phone}
              </p>
            )}
          </div>

          {/* Actions d'édition */}
          {isEditing && (
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancel}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    <span>Sauvegarder</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Changement de mot de passe */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="ri-lock-line text-amber-600 dark:text-amber-400 text-xl"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Sécurité du Compte
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Modifiez votre mot de passe pour sécuriser votre compte
              </p>
            </div>
          </div>
          
          {!showPasswordForm && (
            <div className="flex justify-end sm:justify-start">
              <button
                onClick={() => setShowPasswordForm(true)}
                className="bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-key-line"></i>
                <span>Changer</span>
              </button>
            </div>
          )}
        </div>

        {showPasswordForm && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mot de passe actuel <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Votre mot de passe actuel"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm ${
                  passwordErrors.currentPassword 
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              />
              {passwordErrors.currentPassword && (
                <p className="text-red-600 dark:text-red-400 text-xs flex items-center">
                  <i className="ri-error-warning-line mr-1"></i>
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nouveau mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Nouveau mot de passe (min. 8 caractères)"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm ${
                  passwordErrors.newPassword 
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              />
              {passwordErrors.newPassword && (
                <p className="text-red-600 dark:text-red-400 text-xs flex items-center">
                  <i className="ri-error-warning-line mr-1"></i>
                  {passwordErrors.newPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirmez le nouveau mot de passe"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm ${
                  passwordErrors.confirmPassword 
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-red-600 dark:text-red-400 text-xs flex items-center">
                  <i className="ri-error-warning-line mr-1"></i>
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordErrors({});
                }}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-7 00 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isChangingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Modification...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    <span>Changer le mot de passe</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
