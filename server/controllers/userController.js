import Stripe from "stripe";
import Course from "../models/Course.js";
import { Purchase } from "../models/purchase.js";
import User from "../models/User.js";
import { CourseProgress } from "../models/CourseProgeress.js";
import { getAuth } from "@clerk/express";

// ✅ 1. Get User Data
export const getUserData = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    console.log("📦 Clerk userId received:", userId);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'UserId not found from Clerk' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User Not Found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 2. Get Enrolled Courses
export const userEnrolledCourses = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    console.log("📦 userId from Clerk (enrollments):", userId);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'UserId not provided' });
    }

    const userData = await User.findById(userId).populate('enrolledCourses');

    if (!userData) {
      return res.status(404).json({ success: false, message: 'User Not Found' });
    }

    res.json({ success: true, enrolledCourses: userData.enrolledCourses || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 3. Purchase Course
export const purchaseCourse = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { courseId } = req.body;
    const { origin } = req.headers;

    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      return res.json({ success: false, message: 'Data Not Found' });
    }

    const amount = (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2);
    const newPurchase = await Purchase.create({ courseId, userId, amount });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const currency = process.env.CURRENCY.toLowerCase();

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: courseData.courseTitle,
          },
          unit_amount: Math.floor(newPurchase.amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: {
        purchaseId: newPurchase._id.toString(),
      },
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 4. Update Course Progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { courseId, lectureId } = req.body;

    const progress = await CourseProgress.findOne({ userId, courseId });

    if (progress) {
      if (progress.lectureCompleted.includes(lectureId)) {
        return res.json({ success: true, message: 'Lecture Already Completed' });
      }
      progress.lectureCompleted.push(lectureId);
      await progress.save();
    } else {
      await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }

    res.json({ success: true, message: 'Progress updated' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 5. Get Course Progress
export const getUserCourseProgress = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { courseId } = req.body;

    const progressData = await CourseProgress.findOne({ userId, courseId });

    res.json({ success: true, progressData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 6. Add Course Rating
export const addUserRating = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { courseId, rating } = req.body;

    if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
      return res.json({ success: false, message: 'Invalid Details' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.json({ success: false, message: 'Course not Found.' });
    }

    const user = await User.findById(userId);
    if (!user || !user.enrolledCourses.includes(courseId)) {
      return res.json({ success: false, message: 'User has not purchased this course.' });
    }

    const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId);
    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      course.courseRatings.push({ userId, rating });
    }

    await course.save();

    res.json({ success: true, message: 'Rating added successfully' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
