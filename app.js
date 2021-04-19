const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'renarena',
  database: 'list_app'
});

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    res.locals.username = 'ゲスト';
    res.locals.isLoggedIn = false;
  } else {
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();
});

app.get('/', (req, res) => {
  res.render('top.ejs');
});

app.get('/index', (req, res) => {
  connection.query(
    'SELECT * FROM items where userid = ?',
    [req.session.userId],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.render('index.ejs', {items: results});
    }
  );
});

app.get('/new', (req, res) => {
  res.render('new.ejs');
});

app.post('/create', (req, res) => {
  connection.query(
    'INSERT INTO items (name, acheieve_date, memo, userid) VALUES (?, ?, ?, ?)',
    [req.body.itemName, req.body.itemDate, req.body.itemMemo, req.session.userId],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.redirect('/index');
    }
  );
});

app.post('/delete/:id', (req, res) => {
  connection.query(
    'DELETE FROM items WHERE id = ?',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.redirect('/index');
    }
  );
});

app.get('/edit/:id', (req, res) => {
  connection.query(
    'SELECT * FROM items WHERE id = ?',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.render('edit.ejs', {item: results[0]});
    }
  );
});

app.post('/update/:id', (req, res) => {
  
  connection.query(
    'UPDATE items SET name = ?, memo = ? WHERE id = ?',
    [req.body.itemName, req.body.itemMemo, req.params.id],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.redirect('/index');
    }
  );
});

app.post('/tassei/:id', (req, res) => {
  connection.query(
    'UPDATE items SET acheievement = 1 WHERE id = ?;',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.redirect('/index');
    }
  );
});

app.get('/acheive', (req, res) => {
  connection.query(
    'SELECT * FROM items where acheievement = 1 and userid = ? order by updated_at',
    [req.session.userId],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.render('acheive.ejs', {items: results});
    }
  );
});

app.get('/korekara', (req, res) => {
  connection.query(
    'SELECT * FROM items where acheievement = 0 and userid = ? order by acheieve_date',
    [req.session.userId],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.render('korekara.ejs', {items: results});
    }
  );
});

app.get('/memo/:id', (req, res) => {
  connection.query(
    'SELECT * FROM items WHERE id = ?',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.render('memo.ejs', {item: results[0]});
    }
  );
});

app.post('/memoupdate/:id', (req, res) => {
  
  connection.query(
    'UPDATE items SET memo = ? WHERE id = ?',
    
    [req.body.itemMemo, req.params.id],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.redirect('/korekara');
    }
  );
});

app.get('/showmemo/:id', (req, res) => {
  connection.query(
    'SELECT * FROM items WHERE id = ?',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.render('showmemo.ejs', {item: results[0]});
    }
  );
});

app.get('/noeditmemo/:id', (req, res) => {
  connection.query(
    'SELECT * FROM items WHERE id = ?',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.log(error);
      }
      res.render('noeditmemo.ejs', {item: results[0]});
    }
  );
});

app.get('/signup', (req, res) => {
  res.render('signup.ejs', { errors: [] });
});

app.post('/signup', 
  (req, res, next) => {
    console.log('入力値が空じゃないかどうか');
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const errors = [];

    if (username === '') {
      errors.push('ユーザー名が空です');
    }

    if (email === '') {
      errors.push('メールアドレスが空です');
    }

    if (password === '') {
      errors.push('パスワードが空です');
    }

    if (errors.length > 0) {
      res.render('signup.ejs', { errors: errors });
    } else {
      next();
    }
  },
  (req, res, next) => {
    console.log('同じメールアドレスは使えない');
    const email = req.body.email;
    const errors = [];
    connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
      (error, results) => {
        if (results.length > 0) {
          errors.push('ユーザー登録に失敗しました');
          res.render('signup.ejs', { errors: errors });
        } else {
          next();
        }
      }
    );
  },
  (req, res) => {
    console.log('ユーザー登録');
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password, 10, (error, hash) => {
      connection.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hash],
        (error, results) => {
          req.session.userId = results.insertId;
          req.session.username = username;
          res.redirect('/index');
        }
      );
    });
  }
);

app.get('/login', (req, res) => {
  res.render('login.ejs', {errors: []});
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const errors = [];
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error, results) => {
      if (results.length > 0) {
        const plain = req.body.password;
        const hash = results[0].password;
      
        bcrypt.compare(plain, hash, (error, isEqual) => {
          if (isEqual) {
            req.session.userId = results[0].id;
            req.session.username = results[0].username;
            res.redirect('/index');
          } else {
            errors.push('パスワードが間違っています');
            res.render('login.ejs', { errors: errors});
            
          }
        });
        
      } else {
        errors.push('メールアドレスが間違っています');
        res.render('login.ejs', { errors: errors});
      }
    }
  );
});

app.get('/logout', (req, res) => {
  req.session.destroy(error => {
    res.redirect('/');
  });
});

app.listen(3000);
