import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import projectsRouter from "./projects";
import analyzeRouter from "./analyze";
import workspaceRouter from "./workspace";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(analyzeRouter);
router.use(workspaceRouter);
router.use(aiRouter);
router.use(projectsRouter);

export default router;
