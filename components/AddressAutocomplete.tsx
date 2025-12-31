'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { MapPin } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, codePostal: string, ville: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  required?: boolean;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

const libraries: ("places")[] = ["places"];

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Commencez à taper une adresse...",
  className = "",
  error,
  required = false
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Charger le script Google Maps
  const { isLoaded: scriptLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Synchroniser la valeur externe avec l'input
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Initialiser les services Google Places
  useEffect(() => {
    if (scriptLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      const div = document.createElement('div');
      placesServiceRef.current = new google.maps.places.PlacesService(div);
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [scriptLoaded]);

  // Récupérer les suggestions
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!autocompleteServiceRef.current || input.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input,
        types: ['address'],
        componentRestrictions: { country: 'fr' },
        sessionToken: sessionTokenRef.current!,
      };

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions, status) => {
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const formattedSuggestions: Suggestion[] = predictions.map((prediction) => ({
              placeId: prediction.place_id,
              mainText: prediction.structured_formatting.main_text,
              secondaryText: prediction.structured_formatting.secondary_text || '',
              description: prediction.description,
            }));
            
            setSuggestions(formattedSuggestions);
            setIsOpen(true);
          } else {
            setSuggestions([]);
            setIsOpen(false);
          }
        }
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des suggestions:', error);
      setIsLoading(false);
      setSuggestions([]);
    }
  }, []);

  // Debounce pour les appels API
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue.length >= 3 && document.activeElement === inputRef.current) {
        fetchSuggestions(inputValue);
      } else if (inputValue.length < 3) {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, fetchSuggestions]);

  // Sélectionner une suggestion
  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    if (!placesServiceRef.current) return;

    // Fermer immédiatement le dropdown
    setIsOpen(false);
    setSuggestions([]);
    setIsLoading(true);

    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.placeId,
        fields: ['address_components', 'formatted_address'],
        sessionToken: sessionTokenRef.current!,
      },
      (place, status) => {
        setIsLoading(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.address_components) {
          let streetNumber = '';
          let route = '';
          let postalCode = '';
          let city = '';

          place.address_components.forEach((component: AddressComponent) => {
            const types = component.types;

            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            } else if (types.includes('route')) {
              route = component.long_name;
            } else if (types.includes('postal_code')) {
              postalCode = component.long_name;
            } else if (types.includes('locality')) {
              city = component.long_name;
            } else if (types.includes('administrative_area_level_2') && !city) {
              city = component.long_name;
            }
          });

          const fullAddress = [streetNumber, route].filter(Boolean).join(' ').trim();
          
          setInputValue(fullAddress);
          onChange(fullAddress, postalCode, city);
          
          // Nouveau token de session
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
      }
    );
  }, [onChange]);

  // Gestion du changement d'input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue, '', '');
  };

  if (loadError) {
    return (
      <div className={`${className} p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl`}>
        <p className="text-red-600 dark:text-red-400 text-sm">
          Erreur de chargement de Google Maps. Vérifiez votre clé API.
        </p>
      </div>
    );
  }

  const baseInputClasses = `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] transition-colors text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 pr-10`;
  const errorClasses = error 
    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800';

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              className={`${baseInputClasses} ${errorClasses} ${className}`}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-lpignore="true"
              data-form-type="other"
            />
            
            {/* Icône */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isLoading ? (
                <i className="ri-loader-4-line animate-spin text-[#335FAD]"></i>
              ) : (
                <MapPin className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>
        </PopoverAnchor>

        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Recherche...
                  </span>
                ) : (
                  "Aucune adresse trouvée"
                )}
              </CommandEmpty>
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.placeId}
                    value={suggestion.placeId}
                    onSelect={() => handleSelectSuggestion(suggestion)}
                    className="cursor-pointer"
                  >
                    <MapPin className="text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{suggestion.mainText}</p>
                      <p className="text-xs text-muted-foreground truncate">{suggestion.secondaryText}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            
            {/* Attribution Google */}
            <div className="px-3 py-2 border-t border-border bg-muted/50">
              <div className="flex items-center justify-end gap-1">
                <span className="text-[10px] text-muted-foreground">powered by</span>
                <img 
                  src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3_hdpi.png" 
                  alt="Powered by Google"
                  className="h-3 dark:invert dark:opacity-70"
                />
              </div>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Message d'erreur */}
      {error && (
        <p className="text-red-600 dark:text-red-400 text-xs mt-2 flex items-center">
          <i className="ri-error-warning-line mr-1"></i>
          {error}
        </p>
      )}
      
      {/* Texte d'aide */}
      {!error && (
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
          <i className="ri-information-line mr-1"></i>
          Tapez au moins 3 caractères pour voir les suggestions
        </p>
      )}
    </div>
  );
}
