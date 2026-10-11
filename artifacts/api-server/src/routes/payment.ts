import { Router } from 'express';
import axios from 'axios';
import { db, transactions } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth';

const paymentRouter = Router();

// 1. ክፍያ መጀመር (Initialize Escrow Payment)
paymentRouter.post('/initialize', requireAuth, async (req, res) => {
  const { productId, amount, email, firstName, lastName, phone } = req.body;
  const buyerId = req.authUser!.id;
  const txRef = `GEBIYA-TX-${Date.now()}`;
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

  try {
    // Escrow Transaction በPending ስቴት ማስመዝገብ
    await db.insert(transactions).values({
      txRef,
      buyerId,
      productId,
      amount,
      status: 'PENDING',
      otpCode,
    });

    // ከChapa ጋር ማገናኘት
    const chapaResponse = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      {
        amount,
        currency: 'ETB',
        email: email || 'buyer@gebiya.com',
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        tx_ref: txRef,
        callback_url: 'https://yourdomain.com/api/payment/verify',
        return_url: 'gebiya://checkout-success',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        },
      }
    );

    return res.status(200).json({
      checkoutUrl: chapaResponse.data.data.checkout_url,
      txRef,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. ክፍያ ማረጋገጫ Callback (Chapa Webhook / Verification)
paymentRouter.get('/verify/:txRef', async (req, res) => {
  const { txRef } = req.params;

  try {
    const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
      headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
    });

    if (response.data.status === 'success') {
      // ገንዘቡ ወደ Escrow ገብቷል
      await db.update(transactions)
        .set({ status: 'HELD_IN_ESCROW' })
        .where(eq(transactions.txRef, txRef));

      return res.status(200).json({ message: 'ክፍያው ተፈፅሞ ገንዘቡ በEscrow ተይዟል' });
    }
    return res.status(400).json({ message: 'ክፍያው አልተረጋገጠም' });
  } catch (error) {
    return res.status(500).json({ error: 'የክፍያ ማረጋገጥ ስህተት' });
  }
});

// 3. እቃው ሲረከብ OTP በማስገባት ገንዘቡን ለሸጩ መልቀቅ (Release Escrow)
paymentRouter.post('/release-escrow', requireAuth, async (req, res) => {
  const { txRef, enteredOtp } = req.body;

  try {
    const [tx] = await db.select().from(transactions).where(eq(transactions.txRef, txRef));

    if (!tx) {
      return res.status(404).json({ error: 'ግብይቱ አልተገኘም' });
    }

    if (tx.buyerId !== req.authUser!.id) {
      return res.status(403).json({ error: 'ይህን ግብይት ማስተዳደር አይፈቀድልዎትም' });
    }

    if (tx.status !== 'HELD_IN_ESCROW') {
      return res.status(409).json({ error: 'ግብይቱ ለመልቀቅ ዝግጁ አይደለም' });
    }

    if (tx.otpCode !== enteredOtp) {
      return res.status(400).json({ error: 'የገባው OTP Code ትክክል አይደለም!' });
    }

    // ገንዘቡን ለሸጩ መፈቀድ (RELEASED)
    await db.update(transactions)
      .set({ status: 'RELEASED' })
      .where(eq(transactions.txRef, txRef));

    return res.status(200).json({ message: 'ገንዘቡ በስኬት ለሸጩ ተለቋል!' });
  } catch (error) {
    return res.status(500).json({ error: 'የEscrow መልቀቅ ስህተት' });
  }
});

export default paymentRouter;
