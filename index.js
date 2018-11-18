const express = require('express');
const uid = require('uid');
const bodyparser = require('body-parser');
const cookieparser = require('cookie-parser');
const path = require('path');
const passport = require('passport');
const flash = require('connect-flash');
const mysql = require('mysql2');
const multer = require('multer');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, uid(10) + '-' + file.fieldname + path.extname(file.originalname))
    }
});

var upload = multer(

    {
        storage: storage,
        fileFilter : function (req,file,cb) {
            checkFileType(file,cb);
        }

    }


).single('myImage');

function checkFileType(file,cb) {
    const filetype = /jpeg|jpg|png|gif/;

    const extname = filetype.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetype.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    }else{
        return cb('Error : Images only');
    }
}

const expresssession = require('express-session');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'raghav',
    password : '*',
    database: 'bpositive'
});

app.set('view engine','ejs');


app.use(expresssession({
    secret: "Blah Blah Blah",
    resave : false,
    saveUninitialized : false
}));

app.use(cookieparser());
app.use(bodyparser.urlencoded({extended: true}));
//passport config
app.use(passport.initialize());
app.use(passport.session());//persistent login sessions
app.use(flash());//use connect-flash for flashing messages stored in session
app.use(express.static(path.join(__dirname,'public')));

require('./config/passportconfig')(passport,connection,uid);
require('./routes/route')(app,passport,connection,upload,uid,io);

http.listen(process.env.PORT || 4000,function () {
    console.log('server started on port 4000')
})