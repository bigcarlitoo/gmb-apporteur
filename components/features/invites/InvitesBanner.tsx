"use client";

import React, { useState } from 'react';
import { InviteModal } from './InviteModal';

export const InvitesBanner = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="bg-gradient-to-r from-[#335FAD] to-[#1e3a6e] rounded-xl shadow-lg overflow-hidden relative mb-8">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <i className="ri-team-line text-9xl text-white"></i>
                </div>

                <div className="relative z-10 px-8 py-6 sm:px-10 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="max-w-xl text-white">
                        <h2 className="text-2xl font-bold mb-2">Développez votre réseau d'apporteurs</h2>
                        <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
                            Invitez facilement de nouveaux apporteurs à rejoindre votre cabinet.
                            Générez des liens d'invitation uniques et suivez leur inscription.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="whitespace-nowrap flex items-center gap-2 px-6 py-3 bg-white text-[#335FAD] font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                        <i className="ri-user-add-line text-lg"></i>
                        Inviter un apporteur
                    </button>
                </div>
            </div>

            <InviteModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                inviteType="apporteur"
            />
        </>
    );
};
