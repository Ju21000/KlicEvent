import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client admin avec la clé secrète service_role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // 1. Vérifier l'identité de l'utilisateur avec son token
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Session invalide ou expirée' }, { status: 401 });
    }

    const userId = user.id;

    // 2. Récupérer tous les événements de l'utilisateur
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('user_id', userId);

    if (eventsError) throw eventsError;

    if (events && events.length > 0) {
      const eventIds = events.map((e) => e.id);

      // 3. Récupérer et supprimer toutes les photos du Storage Supabase
      const { data: photos } = await supabaseAdmin
        .from('photos')
        .select('url')
        .in('event_id', eventIds);

      if (photos && photos.length > 0) {
        // Extraction des chemins de fichiers dans le bucket event-photos
        const filePaths = photos
          .map((p) => {
            try {
              const urlParts = p.url.split('/event-photos/');
              return urlParts.length > 1 ? urlParts[1] : null;
            } catch {
              return null;
            }
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabaseAdmin.storage.from('event-photos').remove(filePaths);
        }
      }

      // 4. Supprimer les entrées dans la table photos
      await supabaseAdmin.from('photos').delete().in('event_id', eventIds);

      // 5. Supprimer les événements
      await supabaseAdmin.from('events').delete().eq('user_id', userId);
    }

    // 6. Supprimer définitivement l'utilisateur d'auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;

    return NextResponse.json({ success: true, message: 'Compte supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur suppression de compte :', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}