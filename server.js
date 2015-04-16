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

app.use(express.static('public'));

var questionSchema = new mongoose.Schema({
  name: String,
  description: String,
  type: String,
  number: Number,

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
  attempts: Number,
  successes: Number,
  successMessage: String,
  questions: [questionSchema]
});
var Quiz = mongoose.model('quizzes', quizSchema);

app.get('/', function(req, res){
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

// view quiz questions
app.get('/quizzes/:quiz_id/take', function(req, res){
  var quizId = req.params.quiz_id;
  Quiz.findById(quizId, function(err, quiz) {
    res.render('take_quiz', {quiz:quiz});
  });
});

// submit answers to the quiz
app.post('/quizzes/:quiz_id/take', function(req, res){
  var quizId = req.params.quiz_id;
  Quiz.findById(quizId, function(err, quiz) {
    var quizResults = gradeQuiz(quiz, req.body);

    quiz.attempts = quiz.attempts + 1;
    if (quizResults.correct) {
      quiz.successes = quiz.successes + 1;
    }

    quiz.save(function(err) {
      if (err) { res.send(err); }
      res.render('quiz_results', {quiz:quiz, quizResults:quizResults});
    });
  });
});

function gradeQuiz(quiz, data){
  console.log('quiz data',data);
  var resultMessage = '';
  var correct = true;

  quiz.questions.forEach(function(question){
    if (!correct) { return; }

    var correctAnswer = question.answer;
    var userAnswer = data['question-' + question.number];

    if (!userAnswer) {
      resultMessage = 'Missing an answer for: ' + question.number;
      correct = false;
    } else if (userAnswer !== correctAnswer) {
      console.log('!==',userAnswer,correctAnswer);
      resultMessage = 'Wrong answer for: ' + question.number;
      correct = false;
    }
  });

  return {message: resultMessage, correct: correct};
}


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
      answer: req.body.answer,
      number: quiz.questions.length + 1,

      // only for multiple-choice questions
      choice1: req.body.choice1,
      choice2: req.body.choice2,
      choice3: req.body.choice3,
      choice4: req.body.choice4
    };

    quiz.questions.push(question);

    quiz.save(function(err){
      if (err) { res.send(err); }
      res.redirect('/quizzes/' + quiz.id);
    });
  });
});

// create a new quiz
app.post('/quizzes', function(req,res){
  var quiz = new Quiz({
    isComplete: false,
    name: req.body.name,
    successMessage: req.body.successMessage,
    attempts: 0,
    successes: 0
  });
  quiz.save( function(err) {
    if (err) { res.send(err); }
    res.redirect('/quizzes/' + quiz.id);
  });
});

app.listen(port, function(){
  console.log('started on port',port);
});
