// import { Webhook } from "svix";
// import User from "../models/User.js";

// export const clerkWebhooks = async (req, res) => {
//   try {
//     const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    
//     console.log("📩 Incoming webhook:", req.body);

//     await whook.verify(JSON.stringify(req.body), {
//       "svix-id": req.headers["svix-id"],
//       "svix-timestamp": req.headers["svix-timestamp"],
//       "svix-signature": req.headers["svix-signature"]
//     });

//     const { data, type } = req.body;
//     console.log("🔔 Webhook type:", type);

//     switch (type) {
//       case 'user.created': {
//         const userData = {
//           _id: data.id,
//           email: data.email_addresses[0].email_address,
//           name: `${data.first_name} ${data.last_name}`,
//           imageUrl: data.image_url,
//         };

//         console.log("👤 Creating user:", userData);
//         await User.create(userData);
//         return res.json({ success: true });
//       }

//       case 'user.updated': {
//         const updatedData = {
//           email: data.email_addresses[0].email_address,
//           name: `${data.first_name} ${data.last_name}`,
//           imageUrl: data.image_url,
//         };

//         console.log("✏️ Updating user:", data.id);
//         await User.findByIdAndUpdate(data.id, updatedData);
//         return res.json({ success: true });
//       }

//       case 'user.deleted': {
//         console.log("🗑️ Deleting user:", data.id);
//         await User.findByIdAndDelete(data.id);
//         return res.json({ success: true });
//       }

//       default:
//         console.warn("⚠️ Unhandled webhook type:", type);
//         return res.status(400).json({ message: "Unhandled webhook type" });
//     }
//   } catch (error) {
//     console.error("❌ Webhook error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };


import { Webhook } from "svix";
import User from "../models/User.js";

export const clerkWebhooks = async (req, res) => {
  try {
    console.log("📩 Incoming webhook:", req.body);

    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"]
    });

    const { data, type } = req.body;
    console.log("🔔 Webhook type:", type);

    switch (type) {
      case 'user.created': {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: `${data.first_name} ${data.last_name}`,
          imageUrl: data.image_url,
        };

        console.log("👤 Creating user:", userData);
        await User.create(userData)
          .then(() => console.log("✅ User inserted into DB"))
          .catch(err => console.error("❌ DB Insert Error:", err));
        
        return res.json({ success: true });
      }

      case 'user.updated': {
        const updatedData = {
          email: data.email_addresses[0].email_address,
          name: `${data.first_name} ${data.last_name}`,
          imageUrl: data.image_url,
        };

        console.log("✏️ Updating user:", data.id);
        await User.findByIdAndUpdate(data.id, updatedData)
          .then(() => console.log("✅ User updated"))
          .catch(err => console.error("❌ Update failed:", err));
        
        return res.json({ success: true });
      }

      case 'user.deleted': {
        console.log("🗑️ Deleting user:", data.id);
        await User.findByIdAndDelete(data.id)
          .then(() => console.log("✅ User deleted"))
          .catch(err => console.error("❌ Deletion failed:", err));
        
        return res.json({ success: true });
      }

      default:
        console.warn("⚠️ Unhandled webhook type:", type);
        return res.status(400).json({ message: "Unhandled webhook type" });
    }
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
