import { Router, Request, Response } from 'express';

const router = Router();
let registeredShops: any[] = [];

// POST /api/shops/register
router.post('/register', (req: Request, res: Response) => {
  const { fullName, phone, faydaNo, tinNo, address, shopType, shopDesc, accountNumber } = req.body;

  if (!fullName || !phone || !faydaNo || !accountNumber) {
    return res.status(400).json({ success: false, message: 'Missing required shop registration fields' });
  }

  const newShop = {
    id: Date.now().toString(),
    fullName,
    phone,
    faydaNo,
    tinNo: tinNo || 'N/A',
    address,
    shopType,
    shopDesc,
    accountNumber,
    createdAt: new Date().toISOString(),
  };

  registeredShops.push(newShop);

  return res.status(201).json({
    success: true,
    message: 'ሱቅዎ በጥሩ ሁኔታ ተመዝግቧል!',
    shop: newShop,
  });
});

export default router;
