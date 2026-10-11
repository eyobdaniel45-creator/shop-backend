import { Router } from "express";
import { db } from "@workspace/db";
import {
  bankAccountsTable,
  insertBankAccountSchema,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router = Router();

// 1. ለገዢዎች እና ለአድሚን፦ ሁሉንም ንቁ የባንክ አካውንቶች ማውጫ
router.get("/", async (_req, res) => {
  try {
    const accounts = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.isActive, true));
    return res.json(accounts);
  } catch (error) {
    return res.status(500).json({ error: "የባንክ አካውንቶችን ማውጣት አልተቻለም" });
  }
});

// 2. ለአድሚን ብቻ፦ አዲስ የባንክ አካውንት መመዝገቢያ
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parseResult = insertBankAccountSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "የተላከው የባንክ መረጃ ትክክል አይደለም", details: parseResult.error });
    }

    const [newAccount] = await db.insert(bankAccountsTable).values(parseResult.data).returning();
    return res.status(201).json(newAccount);
  } catch (error) {
    return res.status(500).json({ error: "አካውንቱን መመዝገብ አልተቻለም" });
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = typeof req.params.id === "string" ? Number(req.params.id) : Number.NaN;
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ትክክለኛ ID ያስገቡ" });
  }

  const parseResult = insertBankAccountSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "የተላከው የባንክ መረጃ ትክክል አይደለም", details: parseResult.error });
  }

  try {
    const [updatedAccount] = await db
      .update(bankAccountsTable)
      .set(parseResult.data)
      .where(eq(bankAccountsTable.id, id))
      .returning();

    if (!updatedAccount) {
      return res.status(404).json({ error: "የባንክ አካውንቱ አልተገኘም" });
    }

    return res.json(updatedAccount);
  } catch (error) {
    return res.status(500).json({ error: "የባንክ አካውንቱን ማዘመን አልተቻለም" });
  }
});

// 3. ለአድሚን ብቻ፦ የባንክ አካውንት ማጥፊያ/ማቦዘኛ (Deactivate)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = typeof req.params.id === "string" ? Number(req.params.id) : Number.NaN;
    if (isNaN(id)) {
      return res.status(400).json({ error: "ትክክለኛ ID ያስገቡ" });
    }

    await db.update(bankAccountsTable).set({ isActive: false }).where(eq(bankAccountsTable.id, id));
    return res.json({ message: "የባንክ አካውንቱ በትክክል ተሰርዟል/ተቦዝኗል" });
  } catch (error) {
    return res.status(500).json({ error: "አካውንቱን መሰረዝ አልተቻለም" });
  }
});

export default router;
