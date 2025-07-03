import { getAuth, clerkClient } from "@clerk/express";

/**
 * Middleware to protect educator-only routes.
 * Verifies the user is authenticated and has 'educator' role in Clerk.
 */
export const protectEducator = async (req, res, next) => {
  try {
    // Extract Clerk user ID from request
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Fetch user object from Clerk
    const user = await clerkClient.users.getUser(userId);

    // Check if user's public metadata contains role 'educator'
    if (user.publicMetadata.role !== "educator") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Educator role required",
      });
    }

    // Store user info on req if needed later
    req.userId = userId;
    req.user = user;

    // Allow request to proceed
    next();
  } catch (error) {
    console.error("protectEducator Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
