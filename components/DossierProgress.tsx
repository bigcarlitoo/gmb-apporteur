
'use client';

interface DossierProgressProps {
  currentStep: number;
}

export default function DossierProgress({ currentStep }: DossierProgressProps) {
  const steps = [
    { number: 1, title: 'Type de dossier', subtitle: 'Seul ou couple' },
    { number: 2, title: 'Informations client', subtitle: 'Données personnelles' },
    { number: 3, title: 'Documents', subtitle: 'Pièces justificatives' }
  ];

  return (
    // Centrage de la progress bar en responsive
    <div className="flex items-center justify-center">
      <div className="flex items-center space-x-2 sm:space-x-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-medium border-2 transition-all duration-300 ${
                currentStep > step.number
                  ? 'bg-green-500 border-green-500 text-white'
                  : currentStep === step.number
                  ? 'bg-[#335FAD] border-[#335FAD] text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
              }`}>
                {currentStep > step.number ? (
                  <i className="ri-check-line"></i>
                ) : (
                  step.number
                )}
              </div>
              
              {/* Step Labels - Hidden on very small screens */}
              <div className="hidden sm:block text-center mt-2">
                <p className={`text-xs font-medium ${
                  currentStep >= step.number 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {step.subtitle}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 transition-colors duration-300 ${
                currentStep > step.number 
                  ? 'bg-green-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
