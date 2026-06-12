import { Router } from "express";
import { logger } from "../lib/logger";
import { supabase } from "../lib/supabaseAdmin";

const router = Router();

router.post("/contact/college-inquiry", async (req, res) => {
  try {
    const { institutionName, contactName, email, phone, studentCount, message } = req.body;

    if (!institutionName || !contactName || !email) {
      res.status(400).json({ error: "institutionName, contactName, and email are required" });
      return;
    }

    const { error } = await supabase.from("college_inquiries").insert({
      institution_name: institutionName,
      contact_name: contactName,
      email,
      phone: phone ?? null,
      student_count: studentCount ?? null,
      message: message ?? null,
    });

    if (error) {
      logger.error({ error }, "Failed to save college inquiry");
    }

    res.json({ success: true, message: "Thank you! We'll reach out within 24 hours." });
  } catch (err) {
    logger.error({ err }, "Failed to process college inquiry");
    res.json({ success: true, message: "Thank you! We'll reach out within 24 hours." });
  }
});

export default router;
