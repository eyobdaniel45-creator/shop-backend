import { Router, Request, Response } from 'express';

const router = Router();
let ordersList: any[] = [];

// POST /api/checkout/pay
router.post('/pay', (req: Request, res: Response) => {
  const { productId, amount, paymentMethod, deliveryTime, deliveryNote } = req.body;

  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

  const newOrder = {
    orderId: 'ORD-' + Date.now(),
    productId,
    amount,
    paymentMethod,
    deliveryTime,
    deliveryNote,
    otpCode: generatedOtp,
    status: 'HELD_IN_ESCROW',
    createdAt: new Date().toISOString(),
  };

  ordersList.push(newOrder);

  return res.status(200).json({
    success: true,
    message: `ክፍያ በ ${paymentMethod} ተፈፅሞ ገንዘብዎ በደህና ሁኔታ በ Escrow ተይዟል!`,
    otpCode: generatedOtp,
    order: newOrder,
  });
});

export default router;
