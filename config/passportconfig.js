const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const bcrypt = require('bcrypt-nodejs');
 
module.exports = function(passport,connection,uid){
    passport.serializeUser(function (user,done) {
        done(null,user);
    });

    passport.deserializeUser(function(id, done) {
        connection.query("select * from users where id = " + "'" + id + "';",function(err,rows){
            if(err){
                console.log(err);
            }else if(rows.length > 0){
                rows[0].type = 'user';
                done(err, rows[0]);
            }else{
                connection.query("select id from users_doc where id = " + "'" + id + "';",function(err1,rows1){
                    if(err1){
                        console.log(err1);
                    }else{
                        rows1[0].type = 'doctor';
                        done(err, rows1[0]);
                    }
                })
            }
        });
    });

    passport.use('local-signup',new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    },
        function (req,email,password,done) {
            // console.log(email);
            // console.log(password);
            var newUserMysql = new Object();
            var keyP = generateHash(password);

            newUserMysql.email    = email;
            newUserMysql.password = keyP; // use the generateHash function in our user model
            var uiid = uid(10);

            connection.execute("INSERT INTO users (id, fname, sname, email, password ) values (" + "'" + uiid + "'," + "'" + req.body.firstname + "'," + "'" + req.body.lastname + "'," + "'" + req.body.email + "'," + "'" + keyP +  "');",function(err,rows){
                if(err){
                    console.log(err);
                    return;
                }

                newUserMysql.id = uiid;

                return done(null, newUserMysql.id);
            });
    }));

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form
        connection.execute("SELECT * FROM users WHERE email = '" + email + "'",function(err,rows){
            if (err)
                return done(err);
            if (rows.length == 0) {
                return done(null, false, req.flash('errMessage', 'No user found.Try again..')); // req.flash is the way to set flashdata using connect-flash
            }

            var opass = rows[0].password;

            if(opass == null){
                return done(null, false, req.flash('errMessage', 'Cant use this method for login..Please try another method')); // req.flash is the way to set flashdata using connect-flash
            }
            // if the user is found but the password is wrong
            if (!(decryptPass(password,opass)))
                return done(null, false, req.flash('errMessage', 'Oops! Wrong password.Try again..')); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            //console.log(rows)
            return done(null, rows[0].id);

        });



    }));

    passport.use('local-login-doctor', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with email and password from our form
        connection.execute("SELECT * FROM users_doc WHERE username = '" + username + "'",function(err,rows){
            if (err)
                return done(err);
            if (rows.length == 0) {
                return done(null, false, req.flash('errMessage', 'No doctor found.Try again..')); // req.flash is the way to set flashdata using connect-flash
            }

            var dpass = rows[0].password;

            if(dpass == null){
                return done(null, false, req.flash('errMessage', 'Cant use this method for login..Please try another method')); // req.flash is the way to set flashdata using connect-flash
            }else if (!(decryptPass(password,dpass))){
                return done(null, false, req.flash('errMessage', 'Oops! Wrong password.Try again..')); // create the loginMessage and save it to session as flashdata
            }else{
            // all is well, return successful user
            //console.log(rows)
                return done(null, rows[0].id);
            }

        });



    }));


    var configAuth = require('./auth');

    passport.use(new GoogleStrategy({
            clientID        : configAuth.googleAuth.clientID,
            clientSecret    : configAuth.googleAuth.clientSecret,
            callbackURL     : configAuth.googleAuth.callbackURL,
        },

        function (token,refreshToken,profile,done) {
            //console.log(profile);
            process.nextTick(function () {
                


                connection.execute("select * from users where id = " + "'" + profile.id + "';",function (err,rows) {
                    if(err){
                        return done(err);
                    }
                    if(rows.length){
                        return done(null,rows[0].id);
                    }else{
                        let passKey = profile._json.etag;
                        let fullName = profile.displayName.split(" ");
                        let fname = fullName[0];
                        let sname = "";
                        if(fullName.length > 1){
                            sname = fullName[1];
                        }
                        let profilepic = "";
                        if(profile.photos.length > 0){
                            let pp = profile.photos[0].value
                            profilepic = pp.replace('sz=50','sz=150');
                        }
                        connection.execute("INSERT INTO users (id, fname, sname, email, password, profilepic, provider ) values (" + "'" + profile.id + "'," + "'" + fname + "'," + "'" + sname + "', " +  "'" + profile.emails[0].value + "'," + "'" + passKey + "', " + "'" + profilepic + "', " + "'" + profile.provider + "');",function(err,rows){
                            if(err){
                                console.log(err)
                            };
                            return done(null, profile.id);
                        });
                    }
                })
            });
        }

    ));


    function generateHash(password) {
        return bcrypt.hashSync(password,bcrypt.genSaltSync(8),null);
    }
        
    function decryptPass(password,opass) {
        return bcrypt.compareSync(password,opass);
    }
}