import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://klic-event-3qvk.vercel.app';

  if (!sessionId) {
    return NextResponse.redirect(`${origin}/create-event`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = session.metadata;

    if (!metadata) {
      throw new Error("Métadonnées de session introuvables.");
    }

    const { title, date, email, formula, maxPhotos, price, userId } = metadata;

    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          title,
          date,
          slug,
          client_email: email,
          max_photos: parseInt(maxPhotos, 10),
          plan_type: formula,
          price: parseFloat(price),
          payment_status: 'paid',
          user_id: userId && userId !== 'null' ? userId : null,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        title: data.title,
        slug: data.slug,
        isPaid: true,
      }),
    });

    return NextResponse.redirect(`${origin}/events/${data.slug}`);
  } catch (err: any) {
    console.error("Erreur validation paiement Stripe :", err);
    return NextResponse.redirect(`${origin}/create-event?error=payment_failed`);
  }
}