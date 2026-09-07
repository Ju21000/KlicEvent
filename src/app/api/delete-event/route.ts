import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: "ID de l'événement manquant" }, { status: 400 });
    }

    // 1. Récupérer toutes les photos de l'événement pour les supprimer du Storage
    const { data: photosData } = await supabase
      .from('photos')
      .select('url')
      .eq('event_id', eventId);

    if (photosData && photosData.length > 0) {
      for (const photo of photosData) {
        const urlParts = photo.url.split('/event-photos/');
        if (urlParts.length > 1) {
          await supabase.storage.from('event-photos').remove([urlParts[1]]);
        }
      }
    }

    // 2. Supprimer les lignes de la table photos
    await supabase.from('photos').delete().eq('event_id', eventId);

    // 3. Supprimer l'événement de la table events
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur serveur lors de la suppression :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}