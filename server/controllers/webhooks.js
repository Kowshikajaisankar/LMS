import { Webhook } from "svix";
import User from "../models/User.js";

export const clerkWebhooks = async (req, res) => {
  console.log("✅ Webhook route hit");

  try {
    // ✅ This is the correct way to read the raw body
    const payload = Buffer.from(req.body).toString("utf8");

    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(payload, headers); // ✅ Signature will now match
    const { data, type } = evt;

    console.log("📬 Webhook type:", type);

    if (type === "user.created") {
      const userData = {
        _id: data.id,
        email: data.email_addresses?.[0]?.email_address || "",
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        imageUrl: data.image_url || "",
      };

      console.log("📦 Creating user:", userData);

      await User.create(userData);
      return res.status(201).json({ success: true });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};
