const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── PRODUKTY I LINKI ─────────────────────────────────────────────
const PRODUCTS = {
  magneticMan: {
    name: 'The Magnetic Man',
    url: 'https://drive.google.com/file/d/1U8nWLVm6xPopeSgGFMcB1i8KCYAnQA1v/view?usp=sharing',
  },
  masteringTheGame: {
    name: 'Mastering The Game',
    url: 'https://drive.google.com/file/d/165SaZaSGAFD9_CpJdYkpaVr7keHEg-Mb/view?usp=sharing',
  },
  electricityBetween: {
    name: 'The Electricity Between',
    url: 'https://drive.google.com/file/d/1TR2fPciECIdWCIHggX4KT0etB-MYL2Pp/view?usp=sharing',
  },
  goGetThem: {
    name: '🎁 Go Get Them (FREE Bonus)',
    url: 'https://drive.google.com/file/d/1Tx3jI1R_clgrldBBu5oMMGgI7MHTn-yO/view?usp=sharing',
  },
};

// ── MAPOWANIE: kwota (w centach) → produkty ─────────────────────
// Dopasuj do swoich Payment Links
const ORDER_MAP = {
  100: [PRODUCTS.magneticMan, PRODUCTS.goGetThem],
  3900: [PRODUCTS.magneticMan, PRODUCTS.goGetThem],                                           // $39 — Magnetic Man
  8800: [PRODUCTS.magneticMan, PRODUCTS.masteringTheGame, PRODUCTS.goGetThem],                // $88 — Bundle
  6900: [PRODUCTS.magneticMan, PRODUCTS.electricityBetween, PRODUCTS.goGetThem],             // $69 — Downsell
};

// ── HANDLER ──────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'Ignored' };
  }

  const session = stripeEvent.data.object;
  const email = session.customer_details?.email;
  const name = session.customer_details?.name || 'there';
  const amountTotal = session.amount_total;

  if (!email) {
    console.error('No email found in session');
    return { statusCode: 200, body: 'No email' };
  }

  const products = ORDER_MAP[amountTotal];

  if (!products) {
    console.warn(`Unknown amount: ${amountTotal} — no email sent`);
    return { statusCode: 200, body: 'Unknown amount' };
  }

  // ── BUDUJ EMAIL ────────────────────────────────────────────────
  const downloadLinks = products
    .map(p => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #2a2a2a;">
          <strong style="color:#ffffff;font-size:15px;">${p.name}</strong><br>
          <a href="${p.url}" style="color:#D4A843;font-size:14px;text-decoration:none;">
            → Click here to open your PDF
          </a>
        </td>
      </tr>
    `)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0d0d0d;font-family:Georgia,serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid #2a2a2a;border-radius:6px;padding:40px;">

            <tr>
              <td style="padding-bottom:28px;border-bottom:1px solid #2a2a2a;">
                <p style="color:#D4A843;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px;">Paul Roten</p>
                <h1 style="color:#ffffff;font-size:24px;margin:0;">Your order is confirmed.</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 0 8px;">
                <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 20px;">
                  Hi ${name}, thank you for your order. Your PDFs are ready — click the links below to open them instantly in Google Drive. Save them to your device so you have permanent access.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${downloadLinks}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding-top:28px;border-top:1px solid #2a2a2a;">
                <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">
                  If you have any issues accessing your files, reply to this email and I'll sort it out personally.<br><br>
                  — Paul
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: 'Paul Roten <onboarding@resend.dev>',
      to: email,
      subject: 'Your PDFs are ready — here are your download links',
      html,
    });

    console.log(`Email sent to ${email} for amount ${amountTotal}`);
    return { statusCode: 200, body: 'Email sent' };

  } catch (err) {
    console.error('Resend error:', err.message);
    return { statusCode: 500, body: 'Email failed' };
  }
};
