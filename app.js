require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const mongoose = require('mongoose');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));
app.set('view engine', 'ejs');
app.use(session( {
  secret: "Okay this is great.",
 resave: false,
 saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect('mongodb://localhost:27017/FeedbackDB', {useNewUrlParser: true, useUnifiedTopology: true,useCreateIndex:true});
const {Schema} = mongoose;
const userSchema = new Schema({
  email: String,
  name:String,
  password: String,
  googleId: String,
  img:String
});
const replySchema = new Schema({
  username:String,
  userid:String,
  reply:String,
  img:String
});
const commentSchema = new Schema({
  username:String,
  userid:String,
  comment:String,
  img:String,
  replies:[replySchema]
});
const feedbackSchema = new Schema({
  title:String,
  desc:String,
  uptick:Number,
  filter:String,
  ncomments:Number,
  comments:[commentSchema]
});
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/feed",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id,name:profile.displayName,img:profile.photos[0].value }, function (err, user) {
      return cb(err, user);
    });
  }
));
const Feedback = mongoose.model("Feedback",feedbackSchema);
const Comment = mongoose.model("Comment",commentSchema);
const Reply = mongoose.model("Reply",replySchema);
app.post("/feedback",function(req,res) {
  const feedback = new Feedback({
    title: req.body.title,
    desc: req.body.desc,
    filter:req.body.options,
    uptick: 0,
    ncomments:0
  });
  feedback.save(function(err) {
    if(!err)
    res.redirect("/");
  });
});
// to catch comments that are added
app.post("/postcomment/:id",async function(req,res) {
  console.log(req.params.id);
  const arr = req.params.id.split("@");
  const fedId = arr[0];
  const comId = arr[1];
  const comment = req.body.comment;
  if(comId==="") {
    const comments = new Comment({
      comment:comment,
      userid:req.user.googleId,
      username:req.user.name,
      img:req.user.img
    });
  await  Feedback.findOne({_id:fedId},function(err,result) {
      if(err)
      console.log(err);
      else {
        result.comments.push(comments);
        result.save(function(err) {
          if(!err)
          res.redirect("/comments/"+result._id);
        });
      }
    });
  }
  else {
    const reply = new Reply({
      reply: comment,
      userid: req.user.googleId,
      username: req.user.name,
      img:req.user.img
    });
  await  Feedback.findOne({_id:fedId},function(err,result) {
      if(err)
      console.log(err);
      else {
        let len = result.comments.length;
        for(let i=0;i<len;i++) {
          if(result.comments[i]._id==comId) {
            console.log(result.comments[i]+"?>?>?>?");
            result.comments[i].replies.push(reply);
            result.save(function(err) {
              if(!err)
              res.redirect("/comments/"+fedId)
            })
          }
        }
      }
    });
  }
});
app.post("/filte",function(req,res) {
  let val = req.body.filter;
  console.log(val);
  if(val==="0")
  res.redirect("/");
  else {
    Feedback.find({},function(err,result){
      if(err)
      console.log(err);
      else {
        if(val==="1") {
          console.log("///");
          result.sort((firstItem, secondItem) => firstItem.ncomments - secondItem.ncomments);
          console.log("???");
          result.reverse();
          res.render("home",{feedbacks:result});
        }
        else if(val==="2") {
          console.log("/?;/");
          result.sort((firstItem, secondItem) => firstItem.uptick - secondItem.uptick);
          console.log("???");
          result.reverse();
          res.render("home",{feedbacks:result});
        }
      }
    });
  }
});
app.get("/filter/:type",function(req,res) {
  const filter = req.params.type;
  if(filter==="ALL")
  res.redirect("/");
  else {
    Feedback.find({filter:filter},function(err,result) {
      if(err)
      console.log(err);
      else {
        res.render("home",{feedbacks:result});
      }
    });
  }
});
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/feed",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/");
    console.log(req.user+">?>?>?>?>?>?>");
    console.log(req.user.name+"::::::::????????");
  });
app.get("/uptick/:id",async function(req,res) {
  const id = req.params.id;
  let upticks;
await  Feedback.findOne({_id:id},function(err,result) {
    if(err)
    console.log(err);
    else {
      upticks = result.uptick;
      console.log(upticks);
    }
  });
  upticks++;
  Feedback.updateOne({_id:id},{uptick:upticks},function(err,result) {
    if(err)
    console.log(err);
    else {
      res.redirect("/");
    }
  });
});
// to catch reply
app.get("/reply/:stat", async function(req,res) {
  let arr = req.params.stat.split("@");
  const fedId = arr[0];
  const comId = arr[1];
  const repId = arr[2];
  console.log(comId+",.,.,.");
  console.log(repId+"<><><><><><><>");
  let id;
    await Feedback.findOne({_id:fedId},function(err,result) {
      if(err)
      console.log(err);
      else {
        arr = result;
        let len = arr.comments.length;
        for(let i=0;i<len;i++) {
          console.log(arr.comments[i]._id+";/;/;/;");
          if(arr.comments[i]._id==comId) {
            console.log("^&(*(^^))");
            if(!repId)
            id = "@"+arr.comments[i].userid;
            else
            id="@"+repId;
            console.log(id+".//");
            break;
          }
        }
      }
    });
    res.render("comments",{feedback:arr,reply:""+id,comment_id:comId});
});
app.get("/comments/:id",function(req,res) {
  if(req.isAuthenticated()) {
    const id = req.params.id;
    Feedback.findOne({_id:id},function(err,result) {
      if(err)
      console.log(err);
      else {
        console.log(result);
          res.render("comments",{feedback:result,reply:"",comment_id:""});
      }
    });
  }
  else
  res.redirect("/login");
});
app.get("/", function(req,res) {
   Feedback.find({}, function(err,result) {
    if(err)
    console.log(err);
    else {
      res.render("home",{feedbacks:result});
    }
  });
});
app.get("/feed",function(req,res) {
  res.render("feedback");
});
app.get("/login", function(req,res) {
  res.render("login");
});
app.listen(3000,function(req,res) {
  console.log("server started");
});
