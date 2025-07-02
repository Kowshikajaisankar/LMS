import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import humanizeDuration from 'humanize-duration';
import { useAuth, useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();

  const { getToken } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser(); // ✅ added isLoaded

  const [allCourses, setAllCourses] = useState([]);
  const [isEducator, setIsEducator] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);

  // ✅ Fetch all available courses
  const fetchAllCourses = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/course/all`);
      if (data.success) {
        setAllCourses(data.courses);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Fetch user profile data
  const fetchUserData = async () => {
    setLoadingUserData(true);
    if (user?.publicMetadata?.role === 'educator') {
      setIsEducator(true);
    }

    try {
      const token = await getToken();
      console.log("🪪 Clerk Token (User Data):", token); // debug

      const { data } = await axios.get(`${backendUrl}/api/user/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setUserData(data.user);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingUserData(false);
    }
  };

  // ✅ Fetch enrolled courses
  const fetchUserEnrolledCourses = async () => {
    try {
      const token = await getToken();
      console.log("🪪 Clerk Token (Enrollments):", token); // debug

      const { data } = await axios.get(`${backendUrl}/api/user/enrolled-courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setEnrolledCourses(data.enrolledCourses.reverse());
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Load user data only when Clerk is ready
  useEffect(() => {
    const loadUserData = async () => {
      if (!isUserLoaded || !user) {
        console.warn("⏳ Clerk user not ready yet");
        setLoadingUserData(false);
        return;
      }

      await fetchUserData();
      await fetchUserEnrolledCourses();
    };

    loadUserData();
  }, [user, isUserLoaded]);

  // ✅ Utility: calculate rating
  const calculateRating = (course) => {
    if (!Array.isArray(course.courseRatings) || course.courseRatings.length === 0) return 0;
    let totalRating = course.courseRatings.reduce((sum, r) => sum + r.rating, 0);
    return Math.floor(totalRating / course.courseRatings.length);
  };

  // ✅ Utility: calculate chapter time
  const calculatechapterTime = (chapter) => {
    let time = 0;
    chapter.chapterContent.forEach((lecture) => {
      time += lecture.lectureDuration;
    });
    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  };

  // ✅ Utility: total course duration
  const calculateCourseDuration = (course) => {
    let time = 0;
    course.courseContent.forEach((chapter) =>
      chapter.chapterContent.forEach((lecture) => {
        time += lecture.lectureDuration;
      })
    );
    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  };

  // ✅ Utility: total number of lectures
  const calculateNoOfLectures = (course) => {
    let totalLectures = 0;
    course.courseContent.forEach((chapter) => {
      if (Array.isArray(chapter.chapterContent)) {
        totalLectures += chapter.chapterContent.length;
      }
    });
    return totalLectures;
  };

  const value = {
    currency,
    allCourses,
    navigate,
    calculateRating,
    isEducator,
    setIsEducator,
    calculateCourseDuration,
    calculateNoOfLectures,
    calculatechapterTime,
    enrolledCourses,
    fetchUserEnrolledCourses,
    backendUrl,
    userData,
    setUserData,
    loadingUserData,
    getToken,
    fetchAllCourses,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
