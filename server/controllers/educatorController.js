import { getAuth, clerkClient } from '@clerk/express';
import Course from '../models/Course.js';
import { v2 as cloudinary } from 'cloudinary';
import { Purchase } from '../models/purchase.js';
import User from '../models/User.js';
import { nanoid } from 'nanoid';

// ✅ 1. Update user role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No userId found' });
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'educator' }
    });

    res.json({ success: true, message: 'You can now publish a course.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 2. Add a course with auto-generated lectureIds
export const addCourse = async (req, res) => {
  try {
    console.log("Reached /add-course");

    const { userId: educatorId } = getAuth(req);
    const imageFile = req.file;
    const courseDataRaw = req.body.courseData;

    if (!educatorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No userId found' });
    }

    if (!imageFile) {
      return res.status(400).json({ success: false, message: 'Thumbnail not uploaded' });
    }

    if (!courseDataRaw) {
      return res.status(400).json({ success: false, message: 'Course data is missing' });
    }

    const parsedCourseData = JSON.parse(courseDataRaw);
    parsedCourseData.educator = educatorId;

    // Add unique lectureId to each lecture
    parsedCourseData.courseContent = parsedCourseData.courseContent.map((chapter) => {
      chapter.chapterContent = chapter.chapterContent.map((lecture) => ({
        ...lecture,
        lectureId: lecture.lectureId || nanoid()
      }));
      return chapter;
    });

    // Upload thumbnail
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);
    parsedCourseData.courseThumbnail = imageUpload.secure_url;

    // Save course
    const newCourse = await Course.create(parsedCourseData);
    await newCourse.save();

    console.log("Course created:", newCourse._id);
    res.json({ success: true, message: 'Course Added Successfully', courseId: newCourse._id });
  } catch (error) {
    console.error("Error in addCourse:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 3. Get courses created by the educator
export const getEducatorCourses = async (req, res) => {
  try {
    const { userId: educator } = getAuth(req);

    if (!educator) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const courses = await Course.find({ educator });
    res.json({ success: true, courses });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 4. Dashboard with earnings and enrolled students
export const educatorDashboardData = async (req, res) => {
  try {
    const { userId: educator } = getAuth(req);

    if (!educator) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const courses = await Course.find({ educator });
    const totalCourses = courses.length;
    const courseIds = courses.map(course => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed'
    });

    const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    const enrolledStudentsData = [];

    for (const course of courses) {
      const students = await User.find({
        _id: { $in: course.enrolledStudents }
      }, 'name imageUrl');

      students.forEach(student => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student
        });
      });
    }

    res.json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses
      }
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ 5. Get enrolled student data for all educator’s courses
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const { userId: educator } = getAuth(req);

    if (!educator) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const courses = await Course.find({ educator });
    const courseIds = courses.map(course => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed'
    })
      .populate('userId', 'name imageUrl')
      .populate('courseId', 'courseTitle');

    const enrolledStudents = purchases.map(purchase => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt
    }));

    res.json({ success: true, enrolledStudents });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
