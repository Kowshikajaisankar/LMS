import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/purchase.js";
import Course from "../models/Course.js";

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

    if (type === "user.updated") {
  const userData = {
    email: data.email_addresses?.[0]?.email_address || "",
    name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
    imageUrl: data.image_url || "",
  };

  console.log("🔄 Updating user:", userData);

  await User.findByIdAndUpdate(data.id, userData, { new: true });
  return res.status(200).json({ success: true });
}

if (type === "user.deleted") {
  console.log("🗑 Deleting user with ID:", data.id);

  await User.findByIdAndDelete(data.id);
  return res.status(200).json({ success: true });
}

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Stripe webhook error:", err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Use correct event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { purchaseId } = session.metadata;

    try {
      const purchaseData = await Purchase.findById(purchaseId);
      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId.toString());

      // ✅ Enroll student
      if (!courseData.enrolledStudents.includes(userData._id)) {
        courseData.enrolledStudents.push(userData._id);
        await courseData.save();
      }

      if (!userData.enrolledCourses.includes(courseData._id)) {
        userData.enrolledCourses.push(courseData._id);
        await userData.save();
      }

      purchaseData.status = 'completed';
      await purchaseData.save();

      console.log("✅ Purchase marked as completed");

    } catch (err) {
      console.error("❌ Error completing purchase:", err.message);
      return response.status(500).send('Internal Server Error');
    }
  }

  // ✅ Optional: Handle payment failure
  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object;
    const { purchaseId } = session.metadata;

    try {
      const purchaseData = await Purchase.findById(purchaseId);
      purchaseData.status = 'failed';
      await purchaseData.save();
    } catch (err) {
      console.error("❌ Failed to update failed status:", err.message);
    }
  }

  response.json({ received: true });
};
