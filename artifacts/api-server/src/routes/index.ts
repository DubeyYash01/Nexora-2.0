import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import projectsRouter from "./projects";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(projectsRouter);

export default router;
