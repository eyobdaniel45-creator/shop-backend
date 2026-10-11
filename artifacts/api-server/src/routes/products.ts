import { Router, Request, Response } from 'express';

const router = Router();

// InMemory Mock Data
let productsList = [
  {
    id: '1',
    title: 'ዘመናዊ ሶፋ (Modern Sofa)',
    price: '25000',
    category: 'የቤት እቃዎች',
    description: 'ከፍተኛ ጥራት ያለው የሳሎን ሶፋ',
    photoUri: 'https://picsum.photos/seed/furniture/800/1200',
    videoUri: 'https://www.w3schools.com/html/mov_bbb.mp4',
    sellerPhone: '0911000000',
    isFavorite: false,
    rating: '4.9',
    reviewsCount: 18,
  },
  {
    id: '2',
    title: 'ስማርት ቲቪ 55 ኢንች (Smart TV)',
    price: '45000',
    category: 'ኤሌክትሮኒክስ',
    description: '4K Ultra HD Smart Android TV',
    photoUri: 'https://picsum.photos/seed/tv/800/1200',
    videoUri: '',
    sellerPhone: '0912345678',
    isFavorite: true,
    rating: '4.7',
    reviewsCount: 9,
  }
];

// GET /api/products
router.get('/', (req: Request, res: Response) => {
  res.status(200).json(productsList);
});

// POST /api/products
router.post('/', (req: Request, res: Response) => {
  const { title, price, category, description, photoUri, videoUri, sellerPhone } = req.body;

  if (!title || !price) {
    return res.status(400).json({ success: false, message: 'Title and Price are required!' });
  }

  const newProduct = {
    id: Date.now().toString(),
    title,
    price: price.toString(),
    category: category || 'የቤት እቃዎች',
    description: description || 'የሱቅ እቃ',
    photoUri: photoUri || 'https://picsum.photos/seed/item/800/1200',
    videoUri: videoUri || '',
    sellerPhone: sellerPhone || '0911000000',
    isFavorite: false,
    rating: '5.0',
    reviewsCount: 1,
    createdAt: new Date().toISOString(),
  };

  productsList.unshift(newProduct);

  return res.status(201).json({
    success: true,
    message: 'እቃው በተሳካ ሁኔታ መደርደሪያ ላይ ተደርድሯል!',
    product: newProduct,
  });
});

export default router;
