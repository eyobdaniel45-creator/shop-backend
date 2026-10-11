import express, { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, users } from '@workspace/db';
import { createAccessToken, requireAuth } from '../middlewares/auth';

export const authRouter = Router();

// 1. የተጠቃሚ / የሸጭ ምዝገባ (Register)
authRouter.post('/register', async (req: express.Request, res: express.Response) => {
  const { fullName, email, password, phone, role, shopName } = req.body;

  if (!email || !password || !fullName || !phone) {
    return res.status(400).json({ error: 'እባክዎን ስም፣ ኢሜይል፣ ፓስወርድ እና ስልክ ያስገቡ!' });
  }

  if (role !== undefined && role !== null && typeof role !== 'string') {
    return res.status(400).json({ error: 'የተጠቃሚ ሚና ትክክል አይደለም' });
  }

  const normalizedRole = typeof role === 'string' && role.trim()
    ? role.trim().toUpperCase()
    : 'BUYER';

  if (normalizedRole !== 'BUYER' && normalizedRole !== 'SELLER') {
    return res.status(400).json({ error: 'ሲመዘገቡ BUYER ወይም SELLER ብቻ መምረጥ ይችላሉ' });
  }

  try {
    // ኢሜይሉ ቀደም ብሎ መኖሩን ማረጋገጥ
    const [existingUser] = await db.select().from(users).where(eq(users.email, email));
    if (existingUser) {
      return res.status(400).json({ error: 'ይህ ኢሜይል ቀደም ብሎ ተመዝግቧል!' });
    }

    // የፓስወርድ ሃሽ ማድረግ (Password Hashing)
    const hashedPassword = await bcrypt.hash(password, 10);

    // አዲስ ተጠቃሚ በ Database ማስመዝገብ
    const [newUser] = await db.insert(users).values({
      fullName,
      email,
      password: hashedPassword,
      phone,
      role: normalizedRole,
      shopName: shopName || null,
    }).returning();

    // JWT Token ማዘጋጀት
    const token = createAccessToken(newUser.id, newUser.role);

    return res.status(201).json({
      message: 'ምዝገባው በስኬት ተጠናቋል!',
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        shopName: newUser.shopName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'የምዝገባ ስህተት ተከሰቷል', details: error.message });
  }
});

// 2. መግቢያ (Login)
authRouter.post('/login', async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'እባክዎን ኢሜይል እና ፓስወርድ ያስገቡ!' });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return res.status(404).json({ error: 'ተጠቃሚው አልተገኘም!' });
    }

    // የፓስወርድ ትክክለኛነት ማረጋገጥ
    const isPasswordValid = user.password
      ? await bcrypt.compare(password, user.password)
      : false;
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'የተሳሳተ ፓስወርድ አስገብተዋል!' });
    }

    // JWT Token መስጠት
    const token = createAccessToken(user.id, user.role);

    return res.status(200).json({
      message: 'በስኬት ገብተዋል!',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        shopName: user.shopName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'የመግባት ስህተት ተከሰቷል', details: error.message });
  }
});

authRouter.get('/me', requireAuth, (req: express.Request, res: express.Response) => {
  return res.status(200).json({
    user: {
      id: req.authUser!.id,
      role: req.authUser!.role,
    },
  });
});

// 3. የፕሮፋይል መረጃ ማምጫ (Get User Profile)
authRouter.get('/profile/:id', async (req: express.Request, res: express.Response) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'የተሳሳተ የተጠቃሚ መለያ ነው' });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      return res.status(404).json({ error: 'ተጠቃሚው አልተገኘም!' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopName: user.shopName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'መረጃውን የማምጣት ስህተት', details: error.message });
  }
});
