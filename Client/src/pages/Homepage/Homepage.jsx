// Homepage.jsx
import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Homepage.css";
import woman from "../../images/womanholdingphone.jpg";
import { Typography } from "@mui/material";
import Context from "../../Context";
import SmallBook from "../../components/smallBook/SmallBook";

function Homepage() {
  const { getRequest } = useContext(Context);
  const [mostLikedBooks, setMostLikedBooks] = useState([]);
  const [mostLikeView, setMostLikeView] = useState(4);
  const navigate = useNavigate();

  const getMostLike = async () => {
    try {
      const response = await getRequest(`/books/getMostLike/${mostLikeView}`);
      if (Array.isArray(response?.data)) {
        setMostLikedBooks(response?.data);
      } else {
        console.error("Invalid response format:", response?.data);
      }
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    getMostLike();
  }, []);

  return (
    <>
      <div className="homepagediv">
        <div className="firsthomepage">
          <div className="firsthomepagetext">
            <Typography
              style={{
                color: "black",
                mr: "1px",
              }}
              dir="rtl"
              variant="h2"
            >
              <b>הסטורי שלי</b>
            </Typography>
            <Typography
              style={{
                color: "black",
                mr: "1px",
              }}
              dir="rtl"
              variant="h6"
            >
              ללמוד מאחרים הוא לראות את העולם מנקודת מבט שונה, להעשיר את הידע
              ולהתרחיש תרבות שונה. דרך הקריאה אנו נכנסים לעולמם של סופרים,
              מחשבותיהם ותפיסת העולם הייחודית שלהם, ובכך מרחיבים את חשיבתנו
              ומפתחים רגישות אמפתיה חדשה
            </Typography>
          </div>

          <img className="firsthomepageimg" src={woman} alt="" />
        </div>
      </div>
      <div className="mostLiked">
        {mostLikedBooks.map((item, index) => (
          <div key={index} style={{ width: "20%" }}>
            <SmallBook Book={item} />
          </div>
        ))}
      </div>
    </>
  );
}

export default Homepage;