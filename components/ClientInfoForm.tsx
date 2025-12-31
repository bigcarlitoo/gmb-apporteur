
'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { CATEGORY_OPTIONS } from '@/lib/constants/exade';
import AddressAutocomplete from '@/components/AddressAutocomplete';

type DossierType = 'seul' | 'couple';

// Options pour les questions métier Exade
const DEPLACEMENT_PRO_OPTIONS = [
  { value: '1', label: 'Moins de 20 000 km/an' },
  { value: '2', label: '20 000 km/an ou plus' }
];

const TRAVAUX_MANUELS_OPTIONS = [
  { value: '0', label: 'Aucun ou occasionnel' },
  { value: '1', label: 'Travail manuel léger (sans outillage lourd, sans échafaudage)' },
  { value: '2', label: 'Travail manuel moyen/important (outillage lourd, échafaudage, explosifs)' }
];

interface ClientInfo {
  // Client principal - Identité
  civilite: string;
  nom: string;
  prenom: string;
  nom_naissance: string;
  dateNaissance: string;
  lieu_naissance: string;  // OBLIGATOIRE pour API Exade
  
  // Adresse séparée (obligatoire Exade)
  adresse: string;
  complement_adresse: string;
  code_postal: string;
  ville: string;
  
  // Contact
  email: string;
  telephone: string;
  
  // Professionnel
  categorie_professionnelle: number;
  revenus: string;
  
  // Santé / Risques (obligatoire pour Generali, SwissLife, MNCAP)
  fumeur: boolean;
  deplacement_pro: number;  // 1 = moins de 20000km, 2 = 20000km+
  travaux_manuels: number;  // 0 = aucun, 1 = léger, 2 = moyen/important
  
  // Client conjoint (si couple)
  conjoint?: {
    civilite: string;
    nom: string;
    prenom: string;
    nom_naissance: string;
    dateNaissance: string;
    lieu_naissance: string;
    categorie_professionnelle: number;
    fumeur: boolean;
    deplacement_pro: number;
    travaux_manuels: number;
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
    civilite: '',
    nom: '',
    prenom: '',
    nom_naissance: '',
    dateNaissance: '',
    lieu_naissance: '',
    adresse: '',
    complement_adresse: '',
    code_postal: '',
    ville: '',
    email: '',
    telephone: '',
    categorie_professionnelle: 0,
    revenus: '',
    fumeur: false,
    deplacement_pro: 1,  // Par défaut: moins de 20000km
    travaux_manuels: 0,  // Par défaut: aucun
    ...(dossierType === 'couple' && {
      conjoint: {
        civilite: '',
        nom: '',
        prenom: '',
        nom_naissance: '',
        dateNaissance: '',
        lieu_naissance: '',
        categorie_professionnelle: 0,
        fumeur: false,
        deplacement_pro: 1,
        travaux_manuels: 0
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

    // Validation client principal - Identité
    if (!formData.civilite) newErrors.civilite = 'La civilité est obligatoire';
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est obligatoire';
    if (!formData.nom_naissance.trim()) newErrors.nom_naissance = 'Le nom de naissance est obligatoire';
    if (!formData.dateNaissance) newErrors.dateNaissance = 'La date de naissance est obligatoire';
    if (!formData.lieu_naissance.trim()) newErrors.lieu_naissance = 'Le lieu de naissance est obligatoire';
    
    // Adresse
    if (!formData.adresse.trim()) newErrors.adresse = 'L\'adresse est obligatoire';
    if (!formData.code_postal.trim()) newErrors.code_postal = 'Le code postal est obligatoire';
    else if (!/^\d{5}$/.test(formData.code_postal.trim())) {
      newErrors.code_postal = 'Code postal invalide (5 chiffres)';
    }
    if (!formData.ville.trim()) newErrors.ville = 'La ville est obligatoire';
    
    // Contact
    if (!formData.email.trim()) newErrors.email = 'L\'email est obligatoire';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }
    if (!formData.telephone.trim()) newErrors.telephone = 'Le téléphone est obligatoire';
    
    // Professionnel
    if (!formData.categorie_professionnelle || formData.categorie_professionnelle === 0) {
      newErrors.categorie_professionnelle = 'La catégorie professionnelle est obligatoire';
    }
    if (!formData.revenus.trim()) newErrors.revenus = 'Les revenus sont obligatoires';

    // Validation conjoint si couple
    if (dossierType === 'couple' && formData.conjoint) {
      if (!formData.conjoint.civilite) newErrors['conjoint.civilite'] = 'La civilité est obligatoire';
      if (!formData.conjoint.nom.trim()) newErrors['conjoint.nom'] = 'Le nom est obligatoire';
      if (!formData.conjoint.prenom.trim()) newErrors['conjoint.prenom'] = 'Le prénom est obligatoire';
      if (!formData.conjoint.nom_naissance.trim()) newErrors['conjoint.nom_naissance'] = 'Le nom de naissance est obligatoire';
      if (!formData.conjoint.dateNaissance) newErrors['conjoint.dateNaissance'] = 'La date de naissance est obligatoire';
      if (!formData.conjoint.lieu_naissance.trim()) newErrors['conjoint.lieu_naissance'] = 'Le lieu de naissance est obligatoire';
      if (!formData.conjoint.categorie_professionnelle || formData.conjoint.categorie_professionnelle === 0) {
        newErrors['conjoint.categorie_professionnelle'] = 'La catégorie professionnelle est obligatoire';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mise à jour des champs
  const updateField = (field: string, value: any) => {
    let processedValue = value;
    
    // Convertir en number pour les champs numériques
    if (['categorie_professionnelle', 'deplacement_pro', 'travaux_manuels',
         'conjoint.categorie_professionnelle', 'conjoint.deplacement_pro', 'conjoint.travaux_manuels'].includes(field)) {
      processedValue = value ? parseInt(value, 10) : 0;
    }
    
    if (field.startsWith('conjoint.')) {
      const conjointField = field.replace('conjoint.', '');
      setFormData(prev => ({
        ...prev,
        conjoint: {
          ...prev.conjoint!,
          [conjointField]: processedValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: processedValue
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
      await new Promise(resolve => setTimeout(resolve, 500));
      onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Composant champ de saisie
  const renderInputField = (
    label: string,
    name: string,
    type: string = 'text',
    value: any,
    required: boolean = true,
    placeholder?: string,
    options?: { value: string; label: string }[],
    helpText?: string
  ) => (
    <div className="space-y-2" key={name}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {type === 'select' ? (
        <Select
          value={String(value)}
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
          onChange={(e) => updateField(name, e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm ${
            errors[name] 
              ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
        />
      )}
      
      {helpText && !errors[name] && (
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
          {helpText}
        </p>
      )}
      
      {errors[name] && (
        <p className="text-red-600 dark:text-red-400 text-xs mt-1 flex items-center">
          <i className="ri-error-warning-line mr-1"></i>
          {errors[name]}
        </p>
      )}
    </div>
  );

  // Composant radio button pour fumeur
  const renderFumeurField = (prefix: string = '') => {
    const fieldName = prefix ? `${prefix}.fumeur` : 'fumeur';
    const value = prefix ? formData.conjoint?.fumeur : formData.fumeur;
    
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Statut fumeur <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center space-x-6 pt-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name={fieldName}
              checked={!value}
              onChange={() => updateField(fieldName, false)}
              className="mr-2 text-[#335FAD] focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Non-fumeur</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name={fieldName}
              checked={value}
              onChange={() => updateField(fieldName, true)}
              className="mr-2 text-[#335FAD] focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Fumeur</span>
          </label>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-xs">
          Inclut cigarettes, cigares, pipe, vape avec nicotine
        </p>
      </div>
    );
  };

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
        {/* Client Principal - Identité */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-xl flex items-center justify-center mr-4">
              <i className="ri-user-line text-[#335FAD] dark:text-indigo-400"></i>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {dossierType === 'couple' ? 'Emprunteur principal - Identité' : 'Identité'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField("Civilité", "civilite", "select", formData.civilite, true, "Sélectionnez", [
              { value: 'M', label: 'M.' },
              { value: 'Mme', label: 'Mme' },
              { value: 'Mlle', label: 'Mlle' }
            ])}
            
            {renderInputField("Nom", "nom", "text", formData.nom, true, "Nom de famille actuel")}
            {renderInputField("Prénom", "prenom", "text", formData.prenom, true, "Prénom")}
            {renderInputField("Nom de naissance", "nom_naissance", "text", formData.nom_naissance, true, "Nom de jeune fille si différent")}
            {renderInputField("Date de naissance", "dateNaissance", "date", formData.dateNaissance, true)}
            {renderInputField("Lieu de naissance", "lieu_naissance", "text", formData.lieu_naissance, true, "Ville ou pays de naissance")}
          </div>
        </div>

        {/* Client Principal - Adresse */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-4">
              <i className="ri-home-4-line text-blue-600 dark:text-blue-400"></i>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              Adresse
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Champ d'autocomplete d'adresse */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Adresse <span className="text-red-500">*</span>
              </label>
              <AddressAutocomplete
                value={formData.adresse}
                onChange={(address, codePostal, ville) => {
                  updateField("adresse", address);
                  if (codePostal) {
                    updateField("code_postal", codePostal);
                  }
                  if (ville) {
                    updateField("ville", ville);
                  }
                }}
                placeholder="Commencez à taper une adresse (ex: 10 rue de la Paix, Paris)"
                error={errors.adresse}
                required={true}
              />
            </div>
            
            {renderInputField("Complément d'adresse", "complement_adresse", "text", formData.complement_adresse, false, "Bâtiment, étage, etc.")}
            {renderInputField("Code postal", "code_postal", "text", formData.code_postal, true, "Ex: 75001")}
            {renderInputField("Ville", "ville", "text", formData.ville, true, "Ville")}
          </div>
        </div>

        {/* Client Principal - Contact */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mr-4">
              <i className="ri-phone-line text-green-600 dark:text-green-400"></i>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              Contact
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField("Email", "email", "email", formData.email, true, "adresse@email.com")}
            {renderInputField("Téléphone portable", "telephone", "tel", formData.telephone, true, "06 12 34 56 78")}
          </div>
        </div>

        {/* Client Principal - Profil professionnel & risques */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mr-4">
              <i className="ri-briefcase-line text-purple-600 dark:text-purple-400"></i>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              Profil professionnel & santé
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField(
              "Catégorie professionnelle",
              "categorie_professionnelle",
              "select",
              String(formData.categorie_professionnelle),
              true,
              "Sélectionnez votre catégorie",
              CATEGORY_OPTIONS
            )}
            
            {renderInputField(
              "Revenus mensuels nets",
              "revenus",
              "number",
              formData.revenus,
              true,
              "Montant en euros"
            )}
            
            {renderFumeurField()}
            
            {renderInputField(
              "Déplacements professionnels",
              "deplacement_pro",
              "select",
              String(formData.deplacement_pro),
              true,
              "Sélectionnez",
              DEPLACEMENT_PRO_OPTIONS,
              "Kilométrage annuel en véhicule pour le travail"
            )}
            
            {renderInputField(
              "Travaux manuels",
              "travaux_manuels",
              "select",
              String(formData.travaux_manuels),
              true,
              "Sélectionnez",
              TRAVAUX_MANUELS_OPTIONS,
              "Type de travaux manuels dans votre activité"
            )}
          </div>
        </div>

        {/* Conjoint si couple */}
        {dossierType === 'couple' && formData.conjoint && (
          <>
            {/* Conjoint - Identité */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mr-4">
                  <i className="ri-user-heart-line text-emerald-600 dark:text-emerald-400"></i>
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Co-emprunteur - Identité
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField("Civilité", "conjoint.civilite", "select", formData.conjoint.civilite, true, "Sélectionnez", [
                  { value: 'M', label: 'M.' },
                  { value: 'Mme', label: 'Mme' },
                  { value: 'Mlle', label: 'Mlle' }
                ])}
                
                {renderInputField("Nom", "conjoint.nom", "text", formData.conjoint.nom, true, "Nom de famille actuel")}
                {renderInputField("Prénom", "conjoint.prenom", "text", formData.conjoint.prenom, true, "Prénom")}
                {renderInputField("Nom de naissance", "conjoint.nom_naissance", "text", formData.conjoint.nom_naissance, true, "Nom de jeune fille si différent")}
                {renderInputField("Date de naissance", "conjoint.dateNaissance", "date", formData.conjoint.dateNaissance, true)}
                {renderInputField("Lieu de naissance", "conjoint.lieu_naissance", "text", formData.conjoint.lieu_naissance, true, "Ville ou pays de naissance")}
              </div>
            </div>

            {/* Conjoint - Profil professionnel & risques */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mr-4">
                  <i className="ri-briefcase-line text-emerald-600 dark:text-emerald-400"></i>
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Co-emprunteur - Profil professionnel & santé
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField(
                  "Catégorie professionnelle",
                  "conjoint.categorie_professionnelle",
                  "select",
                  String(formData.conjoint.categorie_professionnelle),
                  true,
                  "Sélectionnez la catégorie",
                  CATEGORY_OPTIONS
                )}
                
                {renderFumeurField('conjoint')}
                
                {renderInputField(
                  "Déplacements professionnels",
                  "conjoint.deplacement_pro",
                  "select",
                  String(formData.conjoint.deplacement_pro),
                  true,
                  "Sélectionnez",
                  DEPLACEMENT_PRO_OPTIONS
                )}
                
                {renderInputField(
                  "Travaux manuels",
                  "conjoint.travaux_manuels",
                  "select",
                  String(formData.conjoint.travaux_manuels),
                  true,
                  "Sélectionnez",
                  TRAVAUX_MANUELS_OPTIONS
                )}
              </div>
            </div>
          </>
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
