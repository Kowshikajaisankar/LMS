import { clerkClient } from "@clerk/express";

export const protectEducator = async (req, res, next) => {
  try {
    // Extract userId from Clerk auth
    const { userId } = req.auth();

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Fetch user data from Clerk
    const response = await clerkClient.users.getUser(userId);


    // Check educator role
    if (response.publicMetadata.role !== 'educator') {
      return res.status(403).json({ success: false, message: 'Unauthorized Access Educator role required' });
    }

    // Allow route to proceed
    next();

  } catch (error) {
    console.error("protectEducator Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
