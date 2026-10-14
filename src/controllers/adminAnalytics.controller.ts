import type { Request, Response } from "express";
import {
  getAnalyticsOverview,
  getAnalyticsTimeSeries,
  getProductPerformance,
  getCohortAnalysis,
  getActivityFeed,
} from "../services/adminAnalytics.service.js";
import { analyticsTimeSeriesQuerySchema } from "../schemas/adminAnalytics.schema.js";

function handleError(error: unknown, res: Response) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  return res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : "Failed",
  });
}

export async function getAnalyticsOverviewController(req: Request, res: Response) {
  try {
    const data = await getAnalyticsOverview(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getAnalyticsTimeSeriesController(req: Request, res: Response) {
  try {
    const query = analyticsTimeSeriesQuerySchema.parse(req.query);
    const data = await getAnalyticsTimeSeries(req.user!.userId, query);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getProductPerformanceController(req: Request, res: Response) {
  try {
    const data = await getProductPerformance(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getCohortAnalysisController(req: Request, res: Response) {
  try {
    const data = await getCohortAnalysis(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getActivityFeedController(req: Request, res: Response) {
  try {
    const data = await getActivityFeed(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(error, res);
  }
}