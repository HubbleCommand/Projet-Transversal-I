const express=require('express')
const mysql=require('mysql')
const bodyParser=require('body-parser')

const app=express()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extend: true}));

let con = mysql.createConnection({
    
});

con.connect(function(err){
	if (err) throw err;
	console.log('connected');
});

app.get('/', function (req, res) { res.send('Hello World meh') });
app.get('/form/person', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get('/form/login', function (req, res) {
    res.sendFile(__dirname + '/login.html');
});
app.get('/verify', function (req, res)  {
    console.log("Verifying");
    email = req.query.email;
    password = req.query.password;
    console.log("EMail   : " + email);
    console.log("Password: " + password);
    retrieved_password ="";

    //checks if email exists
    con.query('SELECT * FROM LoginStuffs where email=?', [email], function (error, results, fields) {
        if (error) throw error;
        console.log(results);
        console.log(results.length);
        
        //need number here because apparently a number isn't always a number
        if (Number(results.length) > 0) { //if there was something sent
            retrieved_password = results[0].password;
            console.log(retrieved_password);
            if (password == retrieved_password) {
                res.sendFile(__dirname + '/usrpg.html');
            }
            else    {
                res.send("Wrong password!");
                res.end();
            }
        }
        else            {
            res.send("This email is not registered!")
        }
    });
});
app.get('/create', function(req,res)    {
    console.log("Going to create account");
    res.sendFile(__dirname + '/createUser.html')
});
app.post('/addUser', function(req,res)  {
    con.query('INSERT INTO LoginStuffs SET ?', req.body, function(error, results, fields)    {
        console.log(results);
        console.log(error);
        if(error != null)   {
            if(error.message = "ER_DUP_ENTRY")  {
                res.send("This email is already registered!")
            }
            else    {
                res.send("Something went wrong creating this account...")
            }
        }
        else    {
            res.sendFile(__dirname + '/login.html');
        }
    });
});
app.get('/stuff', function (req, res)   {
	con.query('SELECT * FROM person', (err, results) => {
		if (err) throw err; 
		res.end(JSON.stringify(results));
	});
});
app.get('/person/:id', function (req, res)  {
	con.query('select * from person where id=?', [req.params.id],
	function (err, results)	{
		if (err) throw err;
		res.end(JSON.stringify(results));	
	});
});
app.get('/person', function (req, res)  {
    con.query('select * from person where id=?', [req.query.id],
        function (err, results, fields) {
            if (err) throw err;
            res.send(results);
        });
});
app.post('/addPerson', function (req, res)  {
    var postData = req.body;
    con.query('INSERT INTO person SET ?', postData, function (error, results, fields) {
        if (error) throw error;
        res.send(results);
    })
});
app.post('/updatePerson', function (req, res) {
    con.query('UPDATE person SET name=?,lastName=?,age=? where id=?', [req.body.name, req.body.lastName, req.body.age, req.body.id], function (error, results, fields) {
        if (error) throw error;
        res.end(JSON.stringify(results));
    });
});
app.delete('/deletePersonByID', function (req, res) {
    console.log(req.body);
    con.query('DELETE FROM person WHERE id=?', [req.body.id], function (error, results, fields) {
        if (error) throw error;
        res.end('Record has been deleted!');
    });
});
app.get('/allPersons', function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000'); // allows react access
    con.query('SELECT * FROM person', (err, results) => {
        if (err) throw err;
        res.send(results);
    });
});
app.listen(3000, function(){console.log('Example app listening on port 3000!')});