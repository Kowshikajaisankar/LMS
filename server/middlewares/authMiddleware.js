import { getAuth, clerkClient } from "@clerk/express";

export const protectEducator = async (req, res, next) => {
  try {
    // ✅ Correctly extract userId from Clerk
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Fetch user data from Clerk
    const user = await clerkClient.users.getUser(userId);

    // ✅ Check educator role in public metadata
    if (user.publicMetadata.role !== 'educator') {
      return res.status(403).json({ success: false, message: 'Unauthorized: Educator role required' });
    }

    // ✅ User is authenticated and authorized
    next();

  } catch (error) {
    console.error("protectEducator Error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
