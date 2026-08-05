import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import settingsRouter from "./settings";
import uiRouter from "./ui";

const router: IRouter = Router();

router.use(uiRouter);
router.use(healthRouter);
router.use(botRouter);
router.use(settingsRouter);

export default router;
