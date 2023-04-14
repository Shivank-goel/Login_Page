//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require ("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const JwtStrategy = require("passport-jwt").Strategy;
      ExtractJwt = require("passport-jwt").ExtractJwt;


 const app = express()


 app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');

app.use(session({
  secret: "our little Secret.",
  resave:false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1/userDB");

const userSchema = new mongoose.Schema( {
  email: String,
  password:String,
  googleId:String,
  useremail:String,
  name:String,
  image:String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User" , userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });

  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope:["profile"]
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, useremail: profile.emails[0].value, name: profile.name.givenName, image: profile.photos[0].value}, function (err, user) {
      return cb(err, user);

    });
  }

));


app.get("/", function(req, res){
  res.render("home");
})

app.get("/auth/google",
passport.authenticate('google',{scope: ["profile", "email"]})

);


app.get("/auth/google/secrets",
passport.authenticate("google", {failureRedirect: "/login"}),
function(req,res){
  res.redirect("/secrets");
});

app.get("/login", function(req, res){
  res.render("login");
})

app.get("/register", function(req, res){
  res.render("register");
})

app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){
    res.render("secrets");
  }else{
    res.render("login");
  }
})

app.get("/logout",function(req, res){
  req.logout(function(err){
    if(err){
      console.log(err);
    }else{
        res.redirect("/");
    }
  });

})

app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.render("/register")
    }else{
      passport.authenticate("local")(req, res,function(){
        res.redirect("/secrets");
      })
    }
  })


  });

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      })
    }
  })


});

app.listen(3000, function(){
  console.log("Server running on Port 3000");
})
