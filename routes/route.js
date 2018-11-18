const nodemailer = require('nodemailer');
const axios = require('axios');
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
module.exports = function(app,passport,connection,upload,uid,io){
    app.get('/addDoc',function(req,res){
        res.render('newDoc',{errMessage : req.flash('errMessage'),successMessage : req.flash('successMessage')});
    });
    app.post('/submitDocData',function(req,res){
        upload(req,res,function(err){
            if(err){
                req.flash('errMessage','There was some problem uploading the data..Please check the data again');
                console.log(err);
            }else{
                if(req.file != null){
                    let id = uid(12);
                    let query = "insert into doctors(id,firstName,lastName,address,practice,sdetails,about,housing,timingMS,timingS,price,longitude,latitude,services,specializations,awards,educations,experience,memberships,registrations,addressShort,fileName,extension,pNumber) values (" + "'" + id + "', " + "'" + req.body.fname + "', " + "'" + req.body.sname + "', " + "'" + req.body.address + "', " + "'" + req.body.practice + "', " + "'" + req.body.sdetails + "', " + "'" + req.body.about + "', " + "'" + req.body.housing + "', " + "'" + req.body.timingMS + "', " + "'" + req.body.timingS + "', " + req.body.price + ", " + "'" + req.body.longitude + "', " + "'" + req.body.latitude + "', " + "'" + req.body.services + "', " + "'" + req.body.specializations + "', " + "'" + req.body.awards + "', " + "'" + req.body.educations + "', " + "'" + req.body.experience + "', " + "'" + req.body.memberships + "', " + "'" + req.body.registrations + "', " + "'" + req.body.AddressShort + "', " +  "'" + req.file.filename + "', " + "'" + req.body.extension + "', " + "'" + req.body.pnum + "');";
                    connection.execute(query,function(err,rows){
                        if(err){
                            console.log(err);
                            req.flash('errMessage','Sql query error..Contact the Admin');
                        }else{
                            console.log('Data added');
                            req.flash('successMessage','successfully updated data..Now you can add more data');
                            createUserDoctor(id);
                        }
                        res.redirect('/addDoc');
                    })
                }else{
                    req.flash('errMessage','There was some problem uploading the file..Please check the input file');
                    res.redirect('/addDoc');
                }
            }
        });
    });


    app.get('/',function(req,res){
        let user = req.user != null && req.user.type == 'user' ? req.user : null;
        res.render('landing.ejs',{user : user});
    });

    app.get('/login',alreadyLoggedIn,function(req,res){
        res.render('login.ejs',{errMessage : req.flash('errMessage')});
    })

    app.get('/signup',alreadyLoggedIn,function(req,res){
        res.render('signup.ejs',{errMessage : req.flash('errMessage')});
    });

    app.post('/sendotp',function(req,res){
        //check whether a user with email already exists or not
        let email = req.body.email;
        let otp = uid(8);
        let output = `<p>Your OTP is </p>
        <h2>${otp}</h2>
        `

        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                   user: 'raghavg06@gmail.com',
                   pass: '*'
               }
        });

        const mailOptions = {
            from: 'raghavg06@gmail.com', // sender address
            to: email, // list of receivers
            subject: 'OTP for Bpositive', // Subject line
            html: output// plain text body
        };

        let q = 'select * from users where email=' + "'" + email + "';";
        connection.execute(q,function(e,r){
            if(e){
                console.log(e);
                return;
            }else if(r.length > 0){
                res.send({emailPresent : true});
            }else{
                let q1 = 'select email from otps where email=' + "'" + email + "';";
                connection.execute(q1,function(err,rows){
                    if(err){
                        console.log(err);
                    }
                    if(rows.length > 0){
                        res.send({otpPresent : true});
                    }else{
                        res.send({otpPresent : false});
                        transporter.sendMail(mailOptions, function (err, info) {
                            if(err)
                            console.log(err)
                            else{
                                let q2 = 'insert into otps values(' + "'" + email + "', " + "'" + otp + "');";
                                connection.execute(q2,function(err1,result){
                                    if(err1){
                                        console.log(err1);
                                    }else{
                                        setTimeout(function(){
                                            let q3 = 'delete from otps where email=' + "'" + email + "';";
                                            connection.execute(q3,function(err2,result2){
                                                if(err2){
                                                    console.log(err2);
                                                }
                                            });
                                        },60000);
                                    }
                                });
                            }
                            
                        });     
                                
                    }
                });
                    }
        });


    });

    app.post('/signup',verifyOtp,passport.authenticate('local-signup',{
        successRedirect : '/',
        failureRedirect : '/signup',
        failureFlash : true
    }));

    app.post('/login',passport.authenticate('local-login',{
        successRedirect : '/',
        failureRedirect : '/login',
        failureFlash : true
    }));

    app.get('/logout',function(req,res){
        if(req.user != null && req.user.type == 'user'){
            req.logout();
            res.redirect('/');
        }else{
            res.send('Unauthorized Attempt!!!')
        }
    });
    app.get('/logout_Doctor',function(req,res){
        // console.log(req.user.type)
        if(req.user != null && req.user.type == 'doctor'){
            req.logout();
            res.redirect('/');
        }else{
            res.send('Unauthorized Attempt!!!')
        }
    });

    app.get('/auth/google',passport.authenticate('google',{scope : ['https://www.googleapis.com/auth/plus.login','profile','email']}));
    app.get('/auth/google/callback',

        passport.authenticate('google',{

            successRedirect : '/',
            failureRedirect : '/login'
        })

    );

    app.get('/profile',isLoggedIn,function(req,res){
        res.render('profile.ejs',{user : req.user,errMessage : req.flash('errMessage'),successMessage : req.flash('successMessage')});
    });

    app.post('/updateProfilePic',isLoggedIn,function(req,res){
        let id = req.user.id;
        upload(req,res,function(err){
            if(err){
                req.flash('errMessage','There was some problem uploading the photo..Please check the input file');
                console.log(err);
                res.redirect('/profile');
            }else{
                //console.log(req.file)
                let q1 = 'update users set provider = "local" where id = ' + "'" + id + "';"
                if(req.file != null){
                    connection.execute(q1,function(err,rows){
                        if(err){
                            console.log(err);
                        }else{
                            let q = 'update feedbacks set provider = "local" where user_id=' + "'" + req.user.id + "';";
                            connection.execute(q,function(e,r){
                                if(e){
                                    console.log(e);
                                    req.flash('errMessage','Error in updating the profile photo..Sorry for inconvenience');
                                }else{
                                    let q2 = 'update users set profilepic =' + "'" + req.file.filename + "' where id = " + "'" + id + "';";
                                    connection.execute(q2,function(err2,result){
                                    if(err2){
                                        console.log(err2);
                                        req.flash('errMessage','Error in updating the profile photo..Sorry for inconvenience');
                                    }else{
                                        req.flash('successMessage','Successfully Uploaded Photo'); 
                                    }
                                         res.redirect('/profile');
                                    });
                                }
                            });
                        }
                        
                    })
                }else{
                    req.flash('errMessage','There was some problem uploading the file..Please check the input file');
                    res.redirect('/profile');
                }
            }
        });
    })

    app.post('/updateProfile',isLoggedIn,function(req,res){
        let id = req.user.id;
        let q = 'update users set fname =' + "'" + req.body.fname + "', sname =" + "'" + req.body.sname + "', gender =" + "'" + req.body.gender + "', bloodgroup =" + "'" + req.body.bloodgroup + "', dob =" + "'" + req.body.dob + "', houseNo =" + "'" + req.body.houseNo + "', street =" + "'" + req.body.street + "', city =" + "'" + req.body.city + "', state=" + "'" + req.body.state + "', pincode=" + "'" + req.body.pincode + "' where id=" + "'" + id + "';";
        connection.execute(q,function(err,rows){
            if(err){
                console.log(err);
                req.flash('errMessage','Error in updating the data..Sorry for inconvenience');
            }else{
                req.flash('successMessage','Successfully Updated Data');
            }

            res.redirect('/profile');
        })
    })

    app.get('/search/:query',function(req,res){
        let user = req.user != null && req.user.type == 'user' ? req.user : null;
        let query = req.params.query.toLowerCase();
       //console.log(query);
       let q = 'select * from doctors where lower(practice) =' + "'" + query + "' order by votes DESC";
       connection.execute(q,function(err,rows){
           if(err){
               console.log(err);
           }else{
               res.render('doctors.ejs',{user : user,data : rows,query : req.params.query})
           }
       });
    })

    app.get('/search/:practice/single',function(req,res){
        let id = req.query.doctor_id;
        let user = req.user != null && req.user.type == 'user' ? req.user : null;
        let query = "select * from doctors where id=" + "'" + id + "';";
        connection.execute(query,function(err,rows){
            if(err){
                console.log(err);
                res.redirect('/');
            }else{
                let q = "select * from feedbacks where doc_id=" + "'" + id + "' limit 5;";
                connection.execute(q,function(err1,rows1){
                    if(err1){
                        console.log(err1);
                        res.redirect('/');
                    }else{
                        connection.execute('select count(*) as totalfeeds from feedbacks where doc_id =' + "'" + id + "';",function(err2,rows2){
                            if(err2){
                                console.log(err2);
                                res.redirect('/');
                            }else{
                                res.render('doctor_single',{user : user,doctor : rows[0],practice : req.params.practice,feedbacks : rows1,totalfeeds : rows2[0].totalfeeds});
                            }
                        })
                    }
                });
            }
        }); 
    });


    var sockets = [];
    var usersockets = [];
    io.on('connection',function(socket){
        // console.log(socket.handshake.query.id)
        if(socket.handshake.query.id != undefined){
            // console.log(socket.handshake.query.id)
            sockets[socket.handshake.query.id] = socket.id;
        }
        if(socket.handshake.query.user_id != undefined){
            usersockets[socket.handshake.query.user_id] = socket.id;
        }
        socket.on('submitFeedback',function(data){
            submitFeedback(data,socket);
        });

        socket.on('docTyping',function(data){
            if(usersockets[data.user_id] != null){
                io.to(usersockets[data.user_id]).emit('docTyping');
            }
        });
        socket.on('docKeyUp',function(data){
            if(usersockets[data.user_id] != null){
                io.to(usersockets[data.user_id]).emit('docKeyUp');
            }
        });

        socket.on('userTyping',function(data){
            if(sockets[data.doc_id] != null){
                console.log(data.doc_id)
                io.to(sockets[data.doc_id]).emit('userTyping');
            }
        });
        socket.on('userKeyUp',function(data){
            if(sockets[data.doc_id] != null){
                io.to(sockets[data.doc_id]).emit('userKeyUp');
            }
        });

        socket.on('docMessage',function(data){
            saveMessage(data,userAcknowledge,'doctor');
        });
        socket.on('userMessage',function(data){
            saveMessage(data,doctorAcknowledge,'user');
        });

        socket.on('disconnect',function(){
            if(socket.handshake.query.id != undefined){
                delete sockets[socket.handshake.query.id];
            }
            if(socket.handshake.query.user_id != undefined){
                delete usersockets[socket.handshake.query.id];
            }
        })
    });

    app.post('/submitFeedback',isLoggedIn2,function(req,res){
        res.send({error : false,id : req.user.id});
    });

    app.post('/editFeedback',isLoggedIn2,function(req,res){
        let date = new Date();
        let d = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
        let problem = req.body.problem.replace(/'/g,"\\'");
        let experience = req.body.experience.replace(/'/g,"\\'");
        problem = problem.replace(/"/g,'\\"');
        experience = experience.replace(/"/g,'\\"');

    
        let query = "update feedbacks set rating = " + req.body.rating + ", problem = " + "'" + problem + "', experience = " + "'" + experience + "', fdate = " + "'" + d + "' where id = " + "'" + req.body.id + "';";
        connection.execute(query,function(err,result){
            if(err){
                console.log(err);
                res.send({error : true});
            }else{
                connection.execute("select totalvotes from doctors where id =" + "'" + req.body.doc_id + "';",function(err1,result1){
                    if(err1){
                        console.log(err1);
                        res.send({error : true});
                    }else{
                        console.log(req.body.prating);
                        console.log('blah')
                        let nrating = parseInt(result1[0].totalvotes) - parseInt(req.body.prating);
                        nrating += parseInt(req.body.rating);
                        connection.execute("update doctors set totalvotes =" + nrating + " where id=" + "'" + req.body.doc_id + "';",function(err2,result2){
                            if(err2){
                                console.log(err2);
                                res.send({error : true});
                            }else{
                                res.send({error : false});
                            }
                        });
                    }
                });
            }
        })
    });

    app.post('/deleteFeedback',isLoggedIn2,function(req,res){
        let fid = req.body.fid;
        let rating = req.body.rating;
        let doc_id = req.body.doc_id;

        connection.execute("select totalvotes,votes from doctors where id =" + "'" + doc_id + "';",function(err,result){
            if(err){
                console.log(err);
                res.send({error : true});
            }else{
                let nrating = parseInt(result[0].totalvotes) - parseInt(rating);
                let nvotes = parseInt(result[0].votes) - 1;
                connection.execute("update doctors set totalvotes =" + nrating + ", votes =" + nvotes + " where id =" + "'" + doc_id + "';",function(err1,result1){
                    if(err1){
                        console.log(err1);
                        res.send({error : true});
                    }else{
                        connection.execute("delete from feedbacks where id =" + "'" + fid + "';",function(err2,result2){
                            if(err2){
                                console.log(err2);
                                res.send({error : true});
                            }else{
                                res.send({error : false});
                            }
                        });
                    }
                });
            }
        });
    });

    app.get('/healthfeed',function(req,res){
        axios.get('https://newsapi.org/v2/everything?language=en&q="health"&sortBy=relavancy&pageSize=15&page=1&apiKey=b997b94e71284df4980207822bbba1d2')
        .then(function(response){
            let user = req.user != null && req.user.type == 'user' ? req.user : null;
            res.render('healthfeed',{articles : response.data.articles,user : user});
        }).catch(function(error){
            console.log(error);
            res.redirect('/');
        });
    });

    app.get('/getFeedbacks',function(req,res){
        let offset = parseInt(req.query.offset);
        let doc_id = req.query.doc_id;
        let user = req.user != null && req.user.type == 'user' ? req.user : null;

        let query = "select * from feedbacks where doc_id =" + "'" + doc_id + "' limit " + offset + ", "  + 5 + ";";
        connection.execute(query,function(err,result){
            if(err){
                console.log(err);
            }else{
                res.send({feedbacks:result,user:user});
            }
        });
    });

    app.get('/doctor-login',function(req,res){
        res.render('doc_login',{errMessage : req.flash('errMessage')});
    });

    app.post('/doctor-login',passport.authenticate('local-login-doctor',{
        successRedirect : '/dashboard',
        failureRedirect : '/login',
        failureFlash : true
    }));

    app.get('/dashboard',isLoggedInDoc,function(req,res){
        connection.execute("select * from doctors where id =" + "'" + req.user.id + "';",function(err,rows){
            if(err || rows[0].length == 0){
                console.log(err);
                req.flash('errMessage','There was some error in loading your profile....Please contact the admin');
                res.redirect('/login');
            }else{
                connection.execute('select * from feedbacks where doc_id = ' + "'" + req.user.id + "';",function(err1,feeds){
                    if(err1){
                        console.log(err1);
                        res.flash('errMessage','Some error occured...please contact the admin');
                        res.redirect('/login');
                    }else{
                        res.render('dashboard',{user : rows[0],feedbacks : feeds});
                    }
                })
            }
        });
    });

    app.get('/dashboard/chats',isLoggedInDoc,function(req,res){
        connection.execute('select * from doctors where id = ' + "'" + req.user.id + "';",function(err,result){
            if(err){
                console.log(err);
            }else{
                connection.execute('select distinct sender_id from chats where recepient_id = ' + "'" + req.user.id + "';",function(err1,users){
                    if(err1){
                        console.log(err1);
                    }else{
                        let query = getString(users);
                        if(users.length > 0){
                            connection.execute("select id,fname,sname,profilepic,provider from users where " + query,function(err2,rows){
                                if(err2){
                                    console.log(err2);
                                }else{
                                    res.render('chat',{user:result[0],patients : rows});
                                }
                            }) 
                        }else{
                            res.render('chat',{user:result[0],patients:[]});
                        }
                    }
                });
            }
        })
    });

    app.get('/getChats',isLoggedIn2Gen,function(req,res){
        let doc_id = req.query.doc_id;
        let user_id = req.query.user_id;

        let hash = crypto.createHash('sha1').update(doc_id + user_id,'utf-8').digest('hex');
        connection.execute("select * from chats where hash = " + "'" + hash + "';",function(err,rows){
            if(err){
                console.log(err);
            }else{
                res.send({conv : rows});
            }
        })
    })

    function getString(users){
        let res = "";
        for(let i=0;i<users.length;i++){
            res += "id = " + "'" + users[i].sender_id + "'";
            if(i < users.length-1){
                res += " OR ";
            }
        }

        return res;
    }

    function createUserDoctor(id){
        let pass = generateHash2('9671967950');
        let username = uid(10);
        connection.execute("insert into users_doc values (" + "'" + id + "', " + "'" + username + "', " + "'" + pass + "');",function(err,rows){
            if(err){
                console.log(err);
            }else{
                console.log('doc created')
                return;
            }
        })
    }

    function generateHash2(password) {
        return bcrypt.hashSync(password,bcrypt.genSaltSync(8),null);
    }
    function verifyOtp(req,res,next){
        let email = req.body.email;
        let otp = req.body.otp;

        let q1 = 'select otp from otps where email=' + "'" + email + "';";

        connection.execute(q1,function(err,result){
            if(err){
                console.log(err);
            }else{
                if(result.length == 0){
                    res.redirect('/signup');
                    return;
                }else{
                    if(otp != result[0].otp){
                        req.flash('errMessage','Incorrect Otp!!');
                        res.redirect('/signup');
                        return;
                    }else{
                        next();
                    }
                }
            }
        });
    }
    function isLoggedIn(req,res,next) {
        if(req.isAuthenticated() && req.user.type == 'user'){
            return next();
        }else{
            req.flash('errMessage','Please Login First');
            res.redirect('/login');
        }
    }
    function isLoggedIn2(req,res,next) {
        if(req.isAuthenticated() && req.user.type == 'user'){
            return next();
        }else{
            res.send({loggedIn : false});
        }
    }
    function isLoggedIn2Gen(req,res,next) {
        if(req.isAuthenticated()){
            return next();
        }else{
            res.send({isLoggedIn : false});
        }
    }
    function alreadyLoggedIn(req,res,next){
        if(req.user != null && req.user.type == 'user'){
            req.flash('errMessage','You are already Logged In');
            res.redirect('/profile');
        }else{
            next();
        }
    }
    function isLoggedInDoc(req,res,next) {
        if(req.isAuthenticated() && req.user.type == 'doctor'){
            return next();
        }else{
            req.flash('errMessage','Please Login First');
            res.redirect('/login');
        }
    }

    function submitFeedback(data,socket){
        let id = uid(10);
        let date = new Date();

        let q = 'select * from doctors where id = ' + "'" + data.doc_id + "';";
        connection.execute(q,function(err1,result){
            if(err1){
                console.log(err1);
                socket.emit('error');
            }else{
                let votes = result[0].votes + 1;
                let rating = parseInt(result[0].totalvotes) + parseInt(data.rating);
                rating = rating.toFixed(2);

                connection.execute("update doctors set votes = " + votes + ", totalvotes = " + rating + " where id = " + "'" + data.doc_id + "';",function(err2,result2){
                    if(err2){
                        console.log(err1);
                        socket.emit('error');
                    }else{
                        let d = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                        let name = data.doc_fname + " " + data.doc_sname;
                        let problem = data.problem.replace(/'/g,"\\'");
                        let experience = data.experience.replace(/'/g,"\\'");
                        problem = problem.replace(/"/g,'\\"');
                        experience = experience.replace(/"/g,'\\"');

                        let query = "insert into feedbacks values(" + "'" + id + "', " + "'" + data.doc_id + "', " + "'" + name + "', " + "'" + problem + "', " + "'" + experience + "', " + data.rating + ", '" + d + "', " + "'" + data.pic + "', " + "'" + data.provider + "', " + "'" + data.user_id + "');";

                        connection.execute(query,function(err,rows){
                            if(err){
                                console.log(err);
                                socket.emit('error');
                            }else{
                                if(sockets[data.doc_id] != undefined){
                                    io.to(sockets[data.doc_id]).emit('feedDone',data);
                                }
                                socket.emit('reload');
                            }
                        });
                    }
                });
                
            }
        });
    }
    function saveMessage(data,acknowledge,sender){
        let hash = crypto.createHash('sha1').update(data.doc_id + data.user_id,'utf-8').digest('hex');
        let sender_id = '';
        let recepient = '';
        if(sender == 'doctor'){
            sender_id = data.doc_id;
            recepient = data.user_id;
        }else{
            sender_id = data.user_id;
            recepient = data.doc_id;
        }
        connection.execute("insert into chats values(" + "'" + hash + "', " + "'" + sender_id + "', " + "'" + recepient + "', " + "'" + data.message + "');",function(err,res){
            if(err){
                console.log(err);
            }else{
                acknowledge(data);
            }
        })
    }

    function userAcknowledge(data){
        if(usersockets[data.user_id] != undefined){
            io.to(usersockets[data.user_id]).emit('acknowledge',{
                message : data.message,
                image : data.image,
                doc_id : data.doc_id
            });
        }
    }

    function doctorAcknowledge(data){
        if(sockets[data.doc_id] != undefined){
            io.to(sockets[data.doc_id]).emit('acknowledge',{
                message : data.message,
                image : data.image,
                user_id : data.user_id
            })
        }
    }
}