import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cette route est uniquement disponible en développement
const isDev = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  // Sécurité : vérifier qu'on est en dev
  if (!isDev) {
    return NextResponse.json(
      { error: 'Cette route n\'est disponible qu\'en développement' },
      { status: 403 }
    );
  }

  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email et nouveau mot de passe requis' },
        { status: 400 }
      );
    }

    // Utiliser le service role pour pouvoir modifier les utilisateurs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuration Supabase manquante (SUPABASE_SERVICE_ROLE_KEY requis)' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Trouver l'utilisateur par email
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      throw getUserError;
    }

    const user = users?.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { error: `Utilisateur non trouvé avec l'email: ${email}` },
        { status: 404 }
      );
    }

    // Mettre à jour le mot de passe
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { 
        password: newPassword,
        user_metadata: {
          ...user.user_metadata,
          dev_password: newPassword // Stocker le mot de passe dev dans les metadata
        }
      }
    );

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Mot de passe réinitialisé pour ${email}`,
      email,
      newPassword
    });

  } catch (error: any) {
    console.error('Erreur reset password:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la réinitialisation' },
      { status: 500 }
    );
  }
}







