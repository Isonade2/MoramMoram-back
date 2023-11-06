const dotenv = require("dotenv");
dotenv.config();
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const KakaoStrategy = require("passport-kakao").Strategy;
const bcrypt = require("bcrypt");
const db = require("../config/db");

passport.use(
  "local",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      console.log("passport의 local-login : ", email, password);
      let users;
      try {
        sql = "SELECT * FROM users WHERE email = ?";
        [users] = await db.query(sql, [email]);
      } catch (err) {
        console.log(err);
      }
      console.log(users);
      //DB 연결 실패등의 에러
      if (users.length === 0) {
        console.log("사용자가 일치하지 않습니다.");
        return done(null, false, {
          code: 401,
          success: false,
          message: "사용자가 일치하지 않습니다.",
        });
      }
      //비밀번호가 일치하지 않을 경우
      const isMatch = await bcrypt.compare(password, users[0].password);
      if (!isMatch) {
        console.log("비밀번호가 일치하지 않습니다.");
        return done(null, false, {
          code: 401,
          success: false,
          message: "비밀번호가 일치하지 않습니다.",
        });
      }
      //비밀번호가 일치할 경우
      console.log("비밀번호 일치!");
      return done(null, users);
    }
  )
);

passport.use(
  "kakao",
  new KakaoStrategy(
    {
      clientID: process.env.KAKAO_ID,
      callbackURL: "/user/kakao/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      console.log("----passport.use 시작 ----");
      console.log(`----profile.id: ${profile._json.id} ----`);
      console.log(`----profile.platformType: ${profile.provider} ----`);
      console.log(`----profile.nickname: ${profile.username} ----`);
      console.log(
        `----profile.email: ${profile._json.kakao_account.email} ----`
      );
      let user;
      try {
        [user] = await db.query(
          "SELECT * FROM users WHERE _id = ? AND platformType = ?",
          [profile._json.id, "kakao"]
        );
        console.log("----user: ----", user);
        console.log("----user 끝----");
        console.log("----user.length: ----", user.length);

        //이미 다른 방식으로 가입된 카카오 계정이면 실패
        const a = 1;
        // if (user.length > 0 && user[0].platformType !== "kakao")
        if (a === 1) {
          console.log("----이미 다른 방식으로 가입된 카카오 계정입니다. ----");
          return done(null, false, {
            code: 401,
            success: false,
            message: "이미 다른 방식으로 가입된 카카오 계정입니다.",
          });
        }

        // 이미 가입된 카카오 프로필이면 성공
        if (user.length > 0) {
          console.log("----카카오 계정으로 로그인 시작 ----");
          console.log(profile);
          done(null, user, { message: "카카오 계정으로 로그인 성공" });
        }
        if (user.length === 0) {
          console.log("----카카오 계정으로 회원가입 시작 ----");
          let results;
          try {
            [results] = await db.query(
              "INSERT INTO users (_id, platformType, nickname, email, password) VALUES (?, ?, ?, ?, ?)",
              [
                profile._json.id,
                "kakao",
                profile.username,
                profile._json.kakao_account.email,
                0,
              ]
            );
          } catch (err) {
            console.log(err);
          }
          done(null, results, { message: "카카오 계정으로 회원가입 성공" });
        }
      } catch (error) {
        console.error(error);
        done(error);
      }
    }
  )
);

passport.serializeUser(function (user, done) {
  console.log("serializeUser() 호출됨.");
  console.log(user);
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  console.log("deserializeUser() 호출됨.");
  console.log(user);
  done(null, user);
});

module.exports = passport;
