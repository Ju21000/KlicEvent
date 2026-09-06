import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-28.acacia' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

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
      // 1. Mettre à jour le statut dans Supabase
      const { data: updatedEvent, error } = await supabase
        .from('events')
        .update({ payment_status: 'paid' })
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error("Erreur mise à jour Supabase :", error);
        return NextResponse.json({ error: 'Supabase update failed' }, { status: 500 });
      }

      // 2. Envoyer l'e-mail de confirmation via Resend
      if (customerEmail) {
        try {
          await resend.emails.send({
            from: 'KlicEvent <onboarding@resend.dev>', // Modifiable une fois ton domaine configuré sur Resend
            to: [customerEmail],
            subject: 'Confirmation de votre événement KlicEvent 🎉',
            html: `
              <h2>Merci pour votre confiance !</h2>
              <p>Votre paiement a bien été validé et votre événement <strong>${updatedEvent?.title || ''}</strong> est désormais actif.</p>
              <p>Vous pouvez dès à présent le retrouver et le partager.</p>
            `,
          });
        } catch (emailErr) {
          console.error("Erreur lors de l'envoi de l'e-mail Resend :", emailErr);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}