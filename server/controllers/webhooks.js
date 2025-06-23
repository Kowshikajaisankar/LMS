import { Webhook } from "svix";
import Stripe from "stripe";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { Purchase } from "../models/purchase.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const clerkWebhooks = async (req, res) => {
  console.log("Clerk Webhook route hit");

  try {
    const payload = Buffer.from(req.body).toString("utf8");

    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(payload, headers);
    const { data, type } = evt;

    console.log("Clerk Webhook type:", type);

    if (type === "user.created") {
      const userData = {
        _id: data.id,
        email: data.email_addresses?.[0]?.email_address || "",
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        imageUrl: data.image_url || "",
      };
      await User.create(userData);
      return res.status(201).json({ success: true });
    }

    if (type === "user.updated") {
      const userData = {
        email: data.email_addresses?.[0]?.email_address || "",
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        imageUrl: data.image_url || "",
      };
      await User.findByIdAndUpdate(data.id, userData, { new: true });
      return res.status(200).json({ success: true });
    }

    if (type === "user.deleted") {
      await User.findByIdAndDelete(data.id);
      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Clerk Webhook error:", error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Stripe Webhook Event:", event.type);

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    try {
      // Get checkout session associated with payment intent
      const sessionList = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1,
      });

      const session = sessionList.data[0];
      const { purchaseId } = session.metadata;

      const purchaseData = await Purchase.findById(purchaseId);
      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId);

      //Enroll user
      if (!courseData.enrolledStudents.includes(userData._id)) {
        courseData.enrolledStudents.push(userData._id);
        await courseData.save();
      }

      if (!userData.enrolledCourses.includes(courseData._id)) {
        userData.enrolledCourses.push(courseData._id);
        await userData.save();
      }

      purchaseData.status = "completed";
      await purchaseData.save();

      console.log("Purchase marked as completed (via payment_intent.succeeded)");
      return res.status(200).json({ received: true });

    } catch (err) {
      console.error("Error handling payment_intent.succeeded:", err.message);
      return res.status(500).send("Server Error");
    }
  }

  return res.status(200).json({ received: true });
};
