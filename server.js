var express = require('express');
var app = express();
var port = process.env.PORT || 5000;
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));

// import mongoose
var mongoose = require('mongoose');

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.
var uristring =
  process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/sample-quizzer';

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err) {
  if (err) {
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + uristring);
  }
});

app.use(session({
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  saveUninitialized: true,
  secret: 'asdlfkjalsdfkj',
  resave: true
}));

var questionSchema = new mongoose.Schema({
  name: String,
  description: String,
  type: String,

  // for multiple-choice:
  choice1: String,
  choice2: String,
  choice3: String,
  choice4: String,

  answer: String,
});
var quizSchema = new mongoose.Schema({
  name: String,
  isComplete: Boolean,
  questions: [questionSchema]
});
var Quiz = mongoose.model('quizzes', quizSchema);

app.get('/', function(req, res){
  console.log('req.session:',req.session);
  Quiz.find({}, function(err, quizzes){
    res.render('index', {quizzes: quizzes});
  });
});

app.get('/quizzes/new', function(req, res){
  res.render('new_quiz');
});

app.get('/quizzes/:quiz_id', function(req, res){
  var quizId = req.params.quiz_id;
  Quiz.findById(quizId, function(err, quiz) {
    if (quiz.isComplete) {
      res.redirect('/quizzes/' + quiz.id + '/take');
    } else {
      res.render('quiz', {quiz:quiz});
    }
  });
});

app.get('/quizzes/:quiz_id/take', function(req, res){
  var quizId = req.params.quiz_id;
  Quiz.findById(quizId, function(err, quiz) {
    res.render('take_quiz', {quiz:quiz});
  });
});

// mark the quiz complete
app.post('/quizzes/:quiz_id/complete', function(req,res){
  var quizId = req.params.quiz_id;
  Quiz.findById(quizId, function(err, quiz) {
    quiz.isComplete = true;
    quiz.save(function(err){
      if (err) { console.log('err:' + err); }
      res.redirect('/quizzes/' + quiz.id);
    });
  });
});

app.post('/quizzes/:quiz_id/answer', function(req,res){
});

app.get('/quizzes/:quiz_id/questions/new', function(req, res){
  var quizId = req.params.quiz_id;
  Quiz.findById(quizId, function(err, quiz) {
    res.render('new_question', {quiz: quiz});
  });
});

// add a new question to a quiz
app.post('/quizzes/:quiz_id/questions', function(req, res){
  var quizId = req.params.quiz_id;
  Quiz.findById(quizId, function(err, quiz) {
    var question = {
      name: req.body.name,
      type: req.body.type,
      description: req.body.description,
      answer: req.body.answer
    };

    quiz.questions.push(question);

    quiz.save(function(err){
      res.redirect('/quizzes/' + quiz.id);
    });
  });
});

app.post('/quizzes', function(req,res){
  var quiz = new Quiz({isComplete: false, name: req.body.name});
  quiz.save( function(err) {
    res.redirect('/quizzes/' + quiz.id);
  });
});

app.listen(port, function(){
  console.log('started on port',port);
});
