

var env = process.env.NODE_ENV || 'development';

if(env === 'development'){
  process.env.PORT = 3000;
  process.env.MONGODB_URI = 'mongodb://localhost:27017/TodoApp'
}else if(env==='test'){
  process.env.PORT = 3000;
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/TodoAppTest'
}


//Library imports
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
var {ObjectID} = require('mongodb')
var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
//Local imports
var {mongoose} = require('./db/db');
var {Todo} = require('./models/todo');
var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');

var app = express();
const port = process.env.PORT || 3000;

//Middle-ware
app.use(bodyParser.json());

//Post route
app.post('/todos', authenticate, (req,res)=>{
  var todo = new Todo({
    text: req.body.text,
    _creator: req.user._id
  });

  todo.save().then((doc)=>{
      res.send(doc);
  }, (e)=>{
      res.status(400).send(e);
  });
});

//POST /users
app.post('/users', (req,res) =>{
  var body = _.pick(req.body,['email','password']);
  var user = new User(body);

  user.save().then(()=>{
    return user.generateAuthToken();
  }).then((token) =>{
    res.header('x-auth', token).send(user);
  }).catch((e) =>{
    res.status(400).send(e);
  });

});

app.delete('/users/me/token', authenticate, (req,res) =>{
  req.user.removeToken(req.token).then(()=>{
    res.status(200).send();
  }, ()=>{
    res.status(400).send();
  });
});



//POST /users/login
app.post('/users/login', (req,res)=>{
  var body = _.pick(req.body, ['email', 'password']);

  var email = body.email;
  var password = body.password;

  User.findByCredentials(email,password).then((user)=>{
    return user.generateAuthToken().then((token)=>{
      res.header('x-auth',token).send(user);
    });
  }).catch((e)=>{
    res.status(400).send();
  });
});

app.get('/users/me', authenticate, (req,res) =>{
  res.send(req.user);
});

//Get route
app.get('/todos', authenticate,(req,res)=>{
  Todo.find({_creator: req.user._id}).then((todos)=>{
    res.send({todos});
  }, (e)=>{
    console.log("kazkas negerai");
    res.status(400).send(e);
  })
});

//Get id route
app.get('/todos/:id', authenticate,(req,res)=>{
  var id = req.params.id;
  if(!ObjectID.isValid(id)){
    return res.status(400).send();
  }
  Todo.findOne({
    _id:id,
    _creator:req.user._id
  }).then((todo)=>{
    if(!todo){
      return res.status(404).send();
    }
    res.send({todo});
  }).catch((e)=>{
    res.status(400).send();
  });
});

//Delete todos
app.delete('/todos/:id', authenticate, (req,res) =>{
  var id = req.params.id;
  if(!ObjectID.isValid(id)){
    return res.status(404).send();
  }
  Todo.findOneAndRemove({
    _id: id,
    _creator: req.user._id
  }).then((todo) =>{
    if(!todo){
      return res.status(404).send();
    }
    res.send({todo});
  }).catch((e)=>{
    res.status(400).send();
  });
});

//Update todos
app.patch('/todos/:id',authenticate,(req,res)=>{
  var id = req.params.id;
  var body = _.pick(req.body,['text','completed']);

  if(!ObjectID.isValid(id)){
    return res.status(404).send();
  }

  if(_.isBoolean(body.completed) && body.completed){
    body.completedAt = new Date().getTime();
  }else{
    body.completed = false;
    body.completedAt = null;
  }

  Todo.findOneAndUpdate({_id:id,_creator:req.user._id}, {$set: body}, {new: true}).then((todo)=>{
    if(!todo){
      return res.status(404).send();
    }
    res.send({todo});
  }).catch((e)=>{
    res.status(400).send();
  });



});

app.listen(port, ()=>{
  console.log(`Started on port ${port}`);
})

module.exports ={app};
