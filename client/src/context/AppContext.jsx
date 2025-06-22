import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import humanizeDuration from 'humanize-duration';
import { useAuth, useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext();

export const AppContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();

  const { getToken } = useAuth();
  const { user } = useUser();

  const [allCourses, setAllCourses] = useState([]);
  const [isEducator, setIsEducator] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [userData, setUserData] = useState(null);

  // ✅ Fetch All Courses
  const fetchAllCourses = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/course/all');
      if (data.success) {
        setAllCourses(data.courses);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Fetch User Profile
  const fetchUserData = async () => {
    if (user?.publicMetadata?.role === 'educator') {
      setIsEducator(true);
    }

    try {
      const token = await getToken();
      const { data } = await axios.get(backendUrl + '/api/user/data', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setUserData(data.user);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Fetch Enrolled Courses
  const fetchUserEnrolledCourses = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(backendUrl + '/api/user/enrolled-courses', {
        headers: { Authorization: `Bearer ${token}` }
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

  // ✅ Combined loader: fetch user profile then enrollments
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        await fetchUserData(); // ensure userData is loaded first
        await fetchUserEnrolledCourses(); // now safe to fetch enrollments
      }
    };

    loadUserData();
  }, [user]);

  // ✅ Load all courses once
  useEffect(() => {
    fetchAllCourses();
  }, []);

  // ✅ Helpers
  const calculateRating = (course) => {
    if (!Array.isArray(course.courseRatings) || course.courseRatings.length === 0) {
      return 0;
    }
    let totalRating = course.courseRatings.reduce((sum, r) => sum + r.rating, 0);
    return Math.floor(totalRating / course.courseRatings.length);
  };

  const calculatechapterTime = (chapter) => {
    let time = 0;
    chapter.chapterContent.forEach((lecture) => {
      time += lecture.lectureDuration;
    });
    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  };

  const calculateCourseDuration = (course) => {
    let time = 0;
    course.courseContent.forEach((chapter) =>
      chapter.chapterContent.forEach((lecture) => {
        time += lecture.lectureDuration;
      })
    );
    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  };

  const calculateNoOfLectures = (course) => {
    let totalLectures = 0;
    course.courseContent.forEach((chapter) => {
      if (Array.isArray(chapter.chapterContent)) {
        totalLectures += chapter.chapterContent.length;
      }
    });
    return totalLectures;
  };

  // ✅ Context value
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
    getToken,
    fetchAllCourses,
  };

  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
};
