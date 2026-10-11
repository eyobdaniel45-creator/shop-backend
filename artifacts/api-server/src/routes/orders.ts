import { Router } from "express";
import { db } from "@lib/db";
import { ordersTable, insertOrderSchema } from "@lib/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// 1. አዲስ ትዕዛዝ መመዝገቢያ (Create New Order)
router.post("/", async (req, res) => {
  try {
    const validatedData = insertOrderSchema.parse(req.body);
    const [newOrder] = await db.insert(ordersTable).values(validatedData).returning();

    return res.status(201).json(newOrder);
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(400).json({ error: "ትዕዛዙን መመዝገብ አልተቻለም፤ መረጃዎቹን በትክክል ያስገቡ" });
  }
});

// 2. ሁሉንም ትዕዛዞች ማውጫ (ለአድሚን ዳሽቦርድ)
router.get("/", async (_req, res) => {
  try {
    const orders = await db.select().from(ordersTable);
    return res.json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    return res.status(500).json({ error: "ትዕዛዞችን ማምጣት አልተቻለም" });
  }
});

// 3. የትዕዛዝ ሁኔታ ማዘመኛ (Approve / Reject Order)
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "የተሳሳተ የትዕዛዝ ሁኔታ" });
    }

    const [updatedOrder] = await db
      .update(ordersTable)
      .set({ status })
      .where(eq(ordersTable.id, Number(id)))
      .returning();

    return res.json(updatedOrder);
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({ error: "የትዕዛዝ ሁኔታ ማዘመን አልተቻለም" });
  }
});

export default router;

