import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { title, date, formula } = await request.json();
    const origin = request.headers.get('origin') || 'https://klic-event-3qvk.vercel.app';

    const unitAmount = formula === 'standard' ? 1500 : 0;

    if (unitAmount === 0) {
      return NextResponse.json({ url: `${origin}/events/success?session_id=free_demo` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `KlicEvent - ${title}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/events/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/create-event`,
      metadata: {
        title,
        date,
        formula,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}