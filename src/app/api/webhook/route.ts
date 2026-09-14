import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-28.acacia' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Client Supabase Admin pour contourner la RLS côté serveur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    console.error('Signature ou secret de webhook manquant');
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Erreur de signature Webhook : ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const eventId = session.metadata?.eventId;
    const customerEmail = session.customer_details?.email;

    if (eventId) {
      // 1. Mise à jour du statut via le client admin
      const { data: updatedEvent, error } = await supabaseAdmin
        .from('events')
        .update({ payment_status: 'paid' })
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('Erreur mise à jour Supabase :', error);
        // On logue l'erreur mais on ne bloque pas le retour 200 pour Stripe
      }

      // 2. Envoi de l'e-mail de confirmation via Resend
      if (customerEmail) {
        try {
          await resend.emails.send({
            from: 'KlicEvent <onboarding@resend.dev>',
            to: [customerEmail],
            subject: 'Confirmation de votre événement KlicEvent 🎉',
            html: `
              <h2>Merci pour votre confiance !</h2>
              <p>Votre paiement a bien été validé et votre événement <strong>${updatedEvent?.title || ''}</strong> est désormais actif.</p>
              <p>Vous pouvez dès à présent le retrouver sur votre espace d'administration.</p>
            `,
          });
        } catch (emailErr) {
          console.error("Erreur lors de l'envoi de l'e-mail Resend :", emailErr);
        }
      }
    }
  }

  // Toujours renvoyer un statut 200 à Stripe pour accuser bonne réception
  return NextResponse.json({ received: true }, { status: 200 });
}