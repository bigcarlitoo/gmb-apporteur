'use client';

import Link from 'next/link';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  variant?: 'default' | 'compact' | 'card';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default'
}: EmptyStateProps) {
  const isCompact = variant === 'compact';
  const isCard = variant === 'card';

  const content = (
    <div className={`flex flex-col items-center justify-center text-center ${
      isCompact ? 'py-8' : isCard ? 'py-12' : 'py-16'
    }`}>
      {/* Icône avec fond décoratif */}
      <div className={`relative ${isCompact ? 'mb-4' : 'mb-6'}`}>
        <div className={`${
          isCompact ? 'w-16 h-16' : 'w-20 h-20'
        } bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center shadow-sm`}>
          <i className={`${icon} ${isCompact ? 'text-2xl' : 'text-3xl'} text-gray-400 dark:text-gray-500`}></i>
        </div>
        {/* Décoration subtile */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#335FAD]/20 rounded-full"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#335FAD]/10 rounded-full"></div>
      </div>

      {/* Titre */}
      <h3 className={`${
        isCompact ? 'text-base' : 'text-lg'
      } font-medium text-gray-900 dark:text-white mb-2`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`${
        isCompact ? 'text-sm max-w-xs' : 'text-base max-w-md'
      } text-gray-500 dark:text-gray-400 mb-6`}>
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className={`${
                  isCompact ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base'
                } bg-[#335FAD] hover:bg-[#335FAD]/90 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg flex items-center gap-2`}
              >
                <i className="ri-add-line"></i>
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className={`${
                  isCompact ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base'
                } bg-[#335FAD] hover:bg-[#335FAD]/90 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg flex items-center gap-2`}
              >
                <i className="ri-add-line"></i>
                {action.label}
              </button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className={`${
                  isCompact ? 'px-4 py-2 text-sm' : 'px-5 py-2.5 text-sm'
                } text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors`}
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                onClick={secondaryAction.onClick}
                className={`${
                  isCompact ? 'px-4 py-2 text-sm' : 'px-5 py-2.5 text-sm'
                } text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors`}
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );

  if (isCard) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {content}
      </div>
    );
  }

  return content;
}

// Variantes prédéfinies pour les cas courants
export function EmptyDossiers({ onCreateNew }: { onCreateNew?: () => void }) {
  return (
    <EmptyState
      icon="ri-folder-open-line"
      title="Aucun dossier"
      description="Vous n'avez pas encore de dossier. Créez votre premier dossier pour commencer."
      action={onCreateNew ? {
        label: "Nouveau dossier",
        onClick: onCreateNew
      } : {
        label: "Nouveau dossier",
        href: "/nouveau-dossier"
      }}
    />
  );
}

export function EmptyDossiersFiltered() {
  return (
    <EmptyState
      icon="ri-search-line"
      title="Aucun résultat"
      description="Aucun dossier ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
      variant="compact"
    />
  );
}

export function EmptyActivities() {
  return (
    <EmptyState
      icon="ri-time-line"
      title="Aucune activité récente"
      description="Il n'y a pas encore d'activité à afficher. Les nouvelles actions apparaîtront ici."
      variant="compact"
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="ri-notification-off-line"
      title="Pas de notification"
      description="Vous êtes à jour ! Aucune nouvelle notification pour le moment."
      variant="compact"
    />
  );
}

export function EmptyApporteurs({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon="ri-user-add-line"
      title="Aucun apporteur"
      description="Vous n'avez pas encore d'apporteur dans votre équipe. Invitez-en un pour commencer à collaborer."
      action={onInvite ? {
        label: "Inviter un apporteur",
        onClick: onInvite
      } : undefined}
    />
  );
}

export function EmptyDevis() {
  return (
    <EmptyState
      icon="ri-file-text-line"
      title="Aucun devis disponible"
      description="Les devis seront générés automatiquement une fois les informations complètes."
      variant="compact"
    />
  );
}

export function EmptyDocuments({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon="ri-upload-cloud-line"
      title="Aucun document"
      description="Ajoutez vos documents pour compléter le dossier."
      action={onUpload ? {
        label: "Ajouter un document",
        onClick: onUpload
      } : undefined}
      variant="compact"
    />
  );
}









