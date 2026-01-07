import { Broker, BrokerInvite, ExadeConfig, WalletSummary } from '../types/model';
import { supabase } from '../lib/supabase';

// --- CENTRALIZED API SERVICE ---

export const api = {
    // --- BROKER CONTEXT ---

    /**
     * Get the list of brokers user has access to.
     * Uses RPC get_my_brokers which returns brokers where user is broker_user OR apporteur.
     */
    getMyBrokers: async (): Promise<Broker[]> => {
        const { data, error } = await supabase.rpc('get_my_brokers');

        if (error) {
            console.error('Error fetching brokers:', error);
            return [];
        }

        if (!data || data.length === 0) {
            return [];
        }

        // Map RPC result to Broker type
        return data.map((row: any) => ({
            id: row.broker_id,
            name: row.broker_name,
            status: row.broker_status,
            onboarding_status: row.onboarding_status || 'created',
        }));
    },

    // --- USER PROFILE ---

    /**
     * Get the apporteur profile of the currently authenticated user.
     * Returns null if user is not authenticated or has no apporteur profile.
     */
    getCurrentApporteurProfile: async (): Promise<{
        id: string;
        user_id: string;
        nom: string;
        prenom: string;
        email: string;
        telephone?: string;
        statut: string;
    } | null> => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return null;
        }

        // Get apporteur profile linked to this user
        const { data, error } = await supabase
            .from('apporteur_profiles')
            .select('id, user_id, nom, prenom, email, telephone, statut')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code !== 'PGRST116') { // Not found is ok
                console.error('Error fetching apporteur profile:', error);
            }
            return null;
        }

        return data;
    },

    // --- INVITES ---

    /**
     * Create a new invite link.
     * Uses RPC create_broker_invite.
     */
    createBrokerInvite: async (payload: { brokerId: string, type: 'apporteur' | 'broker_user', expiresInHours: number, maxUses: number }): Promise<BrokerInvite> => {
        const { data, error } = await supabase.rpc('create_broker_invite', {
            p_broker_id: payload.brokerId,
            p_invite_type: payload.type,
            p_expires_in_hours: payload.expiresInHours,
            p_max_uses: payload.maxUses
        });

        if (error) {
            console.error('Error creating invite:', error);
            throw new Error(`Erreur lors de la création de l'invitation: ${error.message}`);
        }

        if (!data?.success) {
            throw new Error(data?.error || "Erreur lors de la création de l'invitation");
        }

        // Build the invite link URL
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || '';
        const linkUrl = `${baseUrl}/invite/${data.token}`;

        return {
            id: data.invite_id,
            broker_id: payload.brokerId,
            invite_type: payload.type,
            token: data.token,
            expires_at: data.expires_at,
            max_uses: data.max_uses,
            uses: 0,
            link_url: linkUrl
        };
    },

    /**
     * Validate an invite token.
     * Uses RPC validate_broker_invite.
     */
    validateBrokerInvite: async (token: string): Promise<{
        is_valid: boolean;
        reason?: string;
        broker_id?: string;
        broker_name?: string;
        owner_name?: string;
        invite_type?: 'apporteur' | 'broker_user';
        expires_at?: string;
        uses_remaining?: number;
    }> => {
        const { data, error } = await supabase.rpc('validate_broker_invite', {
            p_token: token
        });

        if (error) {
            console.error('Error validating invite:', error);
            return { is_valid: false, reason: 'Erreur de validation' };
        }

        return {
            is_valid: data?.is_valid || false,
            reason: data?.reason,
            broker_id: data?.broker_id,
            broker_name: data?.broker_name,
            owner_name: data?.owner_name,
            invite_type: data?.invite_type,
            expires_at: data?.expires_at,
            uses_remaining: data?.uses_remaining
        };
    },

    /**
     * Consume an invite token (use it to join a broker).
     * Uses RPC consume_broker_invite.
     */
    consumeBrokerInvite: async (token: string): Promise<{
        success: boolean;
        error?: string;
        broker_id?: string;
        invite_type?: string;
    }> => {
        const { data, error } = await supabase.rpc('consume_broker_invite', {
            p_token: token
        });

        if (error) {
            console.error('Error consuming invite:', error);
            return { success: false, error: 'Erreur lors de l\'acceptation de l\'invitation' };
        }

        return {
            success: data?.success || false,
            error: data?.error,
            broker_id: data?.broker_id,
            invite_type: data?.invite_type
        };
    },

    // --- EXADE ---

    /**
     * Get Exade Configuration for a broker.
     * Reads from broker_exade_configs table.
     * Includes all credentials needed for API calls.
     */
    getExadeConfig: async (brokerId: string): Promise<ExadeConfig | null> => {
        const { data, error } = await supabase
            .from('broker_exade_configs')
            .select('id, broker_id, code_courtier, licence_key, sso_key, endpoint_url, is_enabled, last_tested_at, last_test_status')
            .eq('broker_id', brokerId)
            .maybeSingle();

        if (error) {
            if (error.code !== 'PGRST116') {
                console.error('Error fetching Exade config:', error);
            }
            return null;
        }

        if (!data) {
            return null;
        }

        return {
            id: data.id,
            broker_id: data.broker_id,
            code_courtier: data.code_courtier,
            licence_key: data.licence_key || '',
            sso_key: data.sso_key || '',
            soap_url: data.endpoint_url || 'https://www.exade.fr/4DSOAP',
            is_enabled: data.is_enabled,
            last_tested_at: data.last_tested_at,
            last_test_status: data.last_test_status as 'success' | 'error' | null
        };
    },

    /**
     * Save Exade Configuration.
     * Upserts into broker_exade_configs table.
     * Stores all credentials for autonomous operation.
     */
    saveExadeConfig: async (brokerId: string, config: Partial<ExadeConfig>): Promise<void> => {
        // First check if config exists
        const { data: existing } = await supabase
            .from('broker_exade_configs')
            .select('id')
            .eq('broker_id', brokerId)
            .maybeSingle();

        const payload = {
            broker_id: brokerId,
            code_courtier: config.code_courtier,
            licence_key: config.licence_key,
            sso_key: config.sso_key || null,
            endpoint_url: config.soap_url || 'https://www.exade.fr/4DSOAP',
            is_enabled: config.is_enabled ?? true,
            configured_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        let error;

        if (existing?.id) {
            // Update existing config
            const result = await supabase
                .from('broker_exade_configs')
                .update(payload)
                .eq('id', existing.id);
            error = result.error;
        } else {
            // Insert new config
            const result = await supabase
                .from('broker_exade_configs')
                .insert(payload);
            error = result.error;
        }

        if (error) {
            console.error('Error saving Exade config:', error);
            throw new Error('Erreur lors de la sauvegarde de la configuration Exade');
        }
    },

    /**
     * Test Exade Connection.
     * Calls server-side API to test the connection with provided credentials.
     */
    testExadeConnection: async (brokerId: string, credentials: {
        code_courtier: string;
        licence_key: string;
        soap_url?: string;
    }): Promise<{ success: boolean; tarifs_count?: number; message?: string }> => {
        const response = await fetch('/api/exade/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                broker_id: brokerId,
                code_courtier: credentials.code_courtier,
                licence_key: credentials.licence_key,
                soap_url: credentials.soap_url || 'https://www.exade.fr/4DSOAP'
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors du test de connexion');
        }

        return data;
    },

    // --- WALLET ---

    /**
     * Get Wallet Summary for a broker.
     * Uses RPC get_wallet_summary and fetches recent transactions.
     */
    getWalletSummary: async (brokerId: string, ownerType: 'broker' | 'apporteur' = 'broker', ownerId?: string): Promise<WalletSummary> => {
        // Get wallet summary via RPC
        const { data: summaryData, error: summaryError } = await supabase.rpc('get_wallet_summary', {
            p_broker_id: brokerId,
            p_owner_type: ownerType,
            p_owner_id: ownerId || null
        });

        if (summaryError) {
            console.error('Error fetching wallet summary:', summaryError);
            // Return empty state on error
            return {
                broker_id: brokerId,
                balance_available: 0,
                balance_pending: 0,
                total_earnings: 0,
                recent_history: []
            };
        }

        // Get the first result (there should only be one wallet account per owner)
        const summary = summaryData?.[0];

        // Fetch recent transactions (last 10)
        const { data: transactionsData } = await supabase
            .from('wallet_transactions')
            .select('id, amount, label, status, created_at')
            .eq('broker_id', brokerId)
            .order('created_at', { ascending: false })
            .limit(10);

        // Calculate total earnings from credit transactions
        const { data: earningsData } = await supabase
            .from('wallet_transactions')
            .select('amount')
            .eq('broker_id', brokerId)
            .eq('type', 'credit')
            .eq('status', 'available');

        const totalEarnings = earningsData?.reduce((sum: number, t: { amount: number | null }) => sum + Number(t.amount || 0), 0) || 0;

        // Map transactions to WalletTransaction type
        const recentHistory = (transactionsData || []).map((t: any) => ({
            id: t.id,
            date: t.created_at,
            amount: Number(t.amount),
            label: t.label,
            status: t.status === 'available' ? 'completed' as const : 'pending' as const
        }));

        return {
            broker_id: brokerId,
            balance_available: Number(summary?.balance_available || 0),
            balance_pending: Number(summary?.balance_pending || 0),
            total_earnings: totalEarnings,
            recent_history: recentHistory
        };
    },

    // --- DOCUMENTS ---

    /**
     * Get a signed view URL for a document.
     * Accepts either a document ID (uuid) or a storage path directly.
     * Returns a time-limited signed URL for private bucket access.
     */
    getDocumentViewUrl: async (documentIdOrPath: string): Promise<string> => {
        let storagePath: string;
        let bucket: string = 'documents';

        // Check if input looks like a UUID (document ID) or a path
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentIdOrPath);

        if (isUuid) {
            // Fetch document metadata from DB to get storage_path and bucket
            const { data: doc, error } = await supabase
                .from('documents')
                .select('storage_path, storage_bucket')
                .eq('id', documentIdOrPath)
                .single();

            if (error || !doc) {
                console.error('Error fetching document:', error);
                throw new Error('Document non trouvé');
            }

            storagePath = doc.storage_path;
            bucket = doc.storage_bucket || 'documents';
        } else {
            // Input is already a storage path
            storagePath = documentIdOrPath;
        }

        // Create signed URL (valid for 1 hour)
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(storagePath, 3600);

        if (error || !data?.signedUrl) {
            console.error('Error creating signed URL:', error);
            throw new Error('Impossible de générer l\'URL du document');
        }

        return data.signedUrl;
    }
};
