
'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

type DossierType = 'seul' | 'couple';

interface ClientInfo {
  // Client principal
  nom: string;
  prenom: string;
  dateNaissance: string;
  profession: string;
  revenus: string;
  fumeur: boolean;
  email: string;
  telephone: string;
  adresse: string;
  
  // Client conjoint (si couple)
  conjoint?: {
    nom: string;
    prenom: string;
    dateNaissance: string;
    profession: string;
    revenus: string;
    fumeur: boolean;
  };
}

interface ClientInfoFormProps {
  dossierType: DossierType;
  initialData: ClientInfo | null;
  onSubmit: (data: ClientInfo) => void;
  onBack: () => void;
}

export default function ClientInfoForm({ dossierType, initialData, onSubmit, onBack }: ClientInfoFormProps) {
  const [formData, setFormData] = useState<ClientInfo>({
    nom: '',
    prenom: '',
    dateNaissance: '',
    profession: '',
    revenus: '',
    fumeur: false,
    email: '',
    telephone: '',
    adresse: '',
    ...(dossierType === 'couple' && {
      conjoint: {
        nom: '',
        prenom: '',
        dateNaissance: '',
        profession: '',
        revenus: '',
        fumeur: false
      }
    })
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Validation des champs
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation client principal
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est obligatoire';
    if (!formData.dateNaissance) newErrors.dateNaissance = 'La date de naissance est obligatoire';
    if (!formData.profession.trim()) newErrors.profession = 'La profession est obligatoire';
    if (!formData.revenus.trim()) newErrors.revenus = 'Les revenus sont obligatoires';
    if (!formData.email.trim()) newErrors.email = 'L\'email est obligatoire';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }
    if (!formData.telephone.trim()) newErrors.telephone = 'Le téléphone est obligatoire';
    if (!formData.adresse.trim()) newErrors.adresse = 'L\'adresse est obligatoire';

    // Validation conjoint si couple
    if (dossierType === 'couple' && formData.conjoint) {
      if (!formData.conjoint.nom.trim()) newErrors['conjoint.nom'] = 'Le nom du conjoint est obligatoire';
      if (!formData.conjoint.prenom.trim()) newErrors['conjoint.prenom'] = 'Le prénom du conjoint est obligatoire';
      if (!formData.conjoint.dateNaissance) newErrors['conjoint.dateNaissance'] = 'La date de naissance du conjoint est obligatoire';
      if (!formData.conjoint.profession.trim()) newErrors['conjoint.profession'] = 'La profession du conjoint est obligatoire';
      if (!formData.conjoint.revenus.trim()) newErrors['conjoint.revenus'] = 'Les revenus du conjoint sont obligatoires';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mise à jour des champs
  const updateField = (field: string, value: any) => {
    if (field.startsWith('conjoint.')) {
      const conjointField = field.replace('conjoint.', '');
      setFormData(prev => ({
        ...prev,
        conjoint: {
          ...prev.conjoint!,
          [conjointField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Supprimer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simuler le traitement
      await new Promise(resolve => setTimeout(resolve, 500));
      onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Composant champ de saisie - Défini en dehors du rendu principal
  const renderInputField = (
    label: string,
    name: string,
    type: string = 'text',
    value: any,
    required: boolean = true,
    placeholder?: string,
    options?: { value: string; label: string }[]
  ) => (
    <div className="space-y-2" key={name}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {type === 'select' ? (
        <Select
          value={value}
          onValueChange={(v) => updateField(name, v)}
        >
          <SelectTrigger className={`w-full ${
            errors[name] 
              ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options?.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => updateField(name, e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm resize-none ${
            errors[name] 
              ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
        />
      ) : type === 'date' ? (
        <DatePicker
          value={value}
          onChange={(v) => updateField(name, v)}
          placeholder={placeholder || "Sélectionnez une date"}
          className={`w-full ${
            errors[name] 
              ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => updateField(name, type === 'checkbox' ? e.target.checked : e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm ${
            errors[name] 
              ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
        />
      )}
      
      {errors[name] && (
        <p className="text-red-600 dark:text-red-400 text-xs mt-1 flex items-center">
          <i className="ri-error-warning-line mr-1"></i>
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white mb-4">
          Informations {dossierType === 'couple' ? 'des clients' : 'du client'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Renseignez les informations personnelles et professionnelles
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Client Principal */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-xl flex items-center justify-center mr-4">
              <i className="ri-user-line text-[#335FAD] dark:text-indigo-400"></i>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {dossierType === 'couple' ? 'Emprunteur principal' : 'Informations personnelles'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField(
              "Nom",
              "nom",
              "text",
              formData.nom,
              true,
              "Nom de famille"
            )}
            
            {renderInputField(
              "Prénom",
              "prenom",
              "text",
              formData.prenom,
              true,
              "Prénom"
            )}
            
            {renderInputField(
              "Date de naissance",
              "dateNaissance",
              "date",
              formData.dateNaissance,
              true
            )}
            
            {renderInputField(
              "Profession",
              "profession",
              "text",
              formData.profession,
              true,
              "Profession actuelle"
            )}
            
            {renderInputField(
              "Revenus mensuels nets",
              "revenus",
              "number",
              formData.revenus,
              true,
              "Montant en euros"
            )}
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Statut fumeur
              </label>
              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="fumeur"
                    checked={!formData.fumeur}
                    onChange={() => updateField('fumeur', false)}
                    className="mr-2 text-[#335FAD] focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Non-fumeur</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="fumeur"
                    checked={formData.fumeur}
                    onChange={() => updateField('fumeur', true)}
                    className="mr-2 text-[#335FAD] focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Fumeur</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {renderInputField(
              "Email",
              "email",
              "email",
              formData.email,
              true,
              "adresse@email.com"
            )}
            
            {renderInputField(
              "Téléphone",
              "telephone",
              "tel",
              formData.telephone,
              true,
              "06 12 34 56 78"
            )}
          </div>

          <div className="mt-6">
            {renderInputField(
              "Adresse complète",
              "adresse",
              "textarea",
              formData.adresse,
              true,
              "Adresse, code postal, ville"
            )}
          </div>
        </div>

        {/* Conjoint si couple */}
        {dossierType === 'couple' && formData.conjoint && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mr-4">
                <i className="ri-user-heart-line text-emerald-600 dark:text-emerald-400"></i>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Co-emprunteur / Conjoint
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInputField(
                "Nom",
                "conjoint.nom",
                "text",
                formData.conjoint.nom,
                true,
                "Nom de famille"
              )}
              
              {renderInputField(
                "Prénom",
                "conjoint.prenom",
                "text",
                formData.conjoint.prenom,
                true,
                "Prénom"
              )}
              
              {renderInputField(
                "Date de naissance",
                "conjoint.dateNaissance",
                "date",
                formData.conjoint.dateNaissance,
                true
              )}
              
              {renderInputField(
                "Profession",
                "conjoint.profession",
                "text",
                formData.conjoint.profession,
                true,
                "Profession actuelle"
              )}
              
              {renderInputField(
                "Revenus mensuels nets",
                "conjoint.revenus",
                "number",
                formData.conjoint.revenus,
                true,
                "Montant en euros"
              )}
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Statut fumeur
                </label>
                <div className="flex items-center space-x-6 pt-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="conjoint.fumeur"
                      checked={!formData.conjoint.fumeur}
                      onChange={() => updateField('conjoint.fumeur', false)}
                      className="mr-2 text-[#335FAD] focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Non-fumeur</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="conjoint.fumeur"
                      checked={formData.conjoint.fumeur}
                      onChange={() => updateField('conjoint.fumeur', true)}
                      className="mr-2 text-[#335FAD] focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Fumeur</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2"
          >
            <i className="ri-arrow-left-line"></i>
            <span>Retour</span>
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-8 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sauvegarde...</span>
              </>
            ) : (
              <>
                <span>Continuer</span>
                <i className="ri-arrow-right-line"></i>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
