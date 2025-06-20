import { Webhook } from "svix";
import User from "../models/User.js";

export const clerkWebhooks = async (req, res) => {
  console.log("✅ Clerk webhook route hit");
  console.log("📦 Incoming headers:", req.headers);
  console.log("📦 Incoming body:", JSON.stringify(req.body, null, 2));

  try {
    // ✅ Disable SVIX verification temporarily for testing
    // Uncomment the below when using real Clerk webhooks
    /*
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });
    console.log("🔐 SVIX webhook verified");
    */

    const { data, type } = req.body;
    console.log("📬 Webhook event type:", type);

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          imageUrl: data.image_url || "",
        };

        console.log("🆕 Creating user:", userData);
        await User.create(userData);
        res.status(201).json({ success: true });
        break;
      }

      case "user.updated": {
        const userData = {
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          imageUrl: data.image_url || "",
        };

        console.log("🔄 Updating user:", userData);
        await User.findByIdAndUpdate(data.id, userData, { new: true });
        res.status(200).json({ success: true });
        break;
      }

      case "user.deleted": {
        console.log("🗑️ Deleting user with ID:", data.id);
        await User.findByIdAndDelete(data.id);
        res.status(200).json({ success: true });
        break;
      }

      default: {
        console.log("⚠️ Unhandled webhook type:", type);
        res.status(200).json({ received: true });
        break;
      }
    }
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};
