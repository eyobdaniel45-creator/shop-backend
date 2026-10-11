import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rootRouter from "./root";
import productsRouter from "./products";
import bankAccountsRouter from "./bankAccounts";
import shopsRouter from "./shops";
import checkoutRouter from "./checkout";

const router: IRouter = Router();

router.use(rootRouter);
router.use(healthRouter);
router.use("/products", productsRouter);
router.use("/bank-accounts", bankAccountsRouter);
router.use("/shops", shopsRouter);
router.use("/checkout", checkoutRouter);

export default router;
