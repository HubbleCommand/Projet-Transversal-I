const express=require('express');
const mysql=require('mysql');
const mysql_sync=require('sync-mysql');
const bodyParser=require('body-parser');
const svd_stuff=require('svd-finder');

const app=express()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extend: true}));

let con = mysql.createConnection({
    
});

con.connect(function(err){
	if (err) throw err;
	console.log('Async MySQL connected');
});

//NOTE:ASYNC SQL doesn't need a connect
var con_sync = new mysql_sync ({
    
});

class Query {
    query (sql, args) {
        return new Promise ( (resolve, reject) => {
            this.con.query( sql, args, (err, results) => {
                if(err != null)                 {
                    if(error.message="ER_DUP_ENTRY")                        {
                        console.log("This ID already exists in the entry!");
                    }
                    else                        {
                        console.log("   Something weird went wrong when inserting!");
                    }
                    return reject(err);
                }
                else                    {
                    resolve(results);
                }
            });
        });
    }
}

app.get('/text',function(req,res)   {
    res.sendFile(__dirname + '/rootPublish.html');
})


app.get('/searchDiscussion',function(req,res) {
    tags=req.query.tags;
    weight=req.query.weight;

    con.query('SELECT id FROM Mot-Discussion WHERE poids>=?', [weight], function (errorS, resultsS, fieldsS) {
        if(errorS)  {

        }
        res.send(resultsS);
    });
});

//cannot use app.get or app.post as the following needs to:
    //get data from req
    //do GET requests to a server
    //do POST requests to a server
app.all('/publishRoot', function(req,res) {
    console.log("Body: " + JSON.stringify(req.body));
    text=req.query.root;

    console.log("Here is the text: " + text);
    allwords = text.toLowerCase()
    allwords = allwords.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    allwords=allwords.replace(/\s{2,}/g," ");
    console.log(allwords);
    allwords=allwords.split(" ");
    console.log(allwords);
    var uniquewords = [];

    for (word in allwords)  {
        if (uniquewords.includes(allwords[word])) {
            console.log(allwords[word] + " already exists in map");
        } 
        else    {
            console.log(allwords[word] + " does not exist, adding");
            uniquewords.push(allwords[word]);
        }
    }
    console.log(uniquewords);
    
    ///NEED NESTED QUERIES AS THEY ARE OTHERWISE ASYNCHRONOUS
    //need to INSERT the comment (userid, texte, date)
    con.query('INSERT INTO `Discussion-Racine`(user_id,titre,texte) values(?,?,?)', [req.query.user_id, req.query.title, req.query.root], function(errorCP, resultsCP, fieldsCP) {
        if(errorCP)         {
            console.log("Error: " + errorCP.message);
        }
        else            {
            //need to INSERT the words (mot)
            for (word in uniquewords)               {
//Synchronous Query
                console.log("Word: " + uniquewords[word]);
                var value = [String(uniquewords[word])];
                console.log("Word: " + value);
                var can_continue = true;
                try {
                    con_sync.query('INSERT INTO `Mot` (mot) values(?)', value)
                }
                catch (err) {
                    console.log("Error inserting word: " + err.message);
                    can_continue = false;
                }
                //need to INSERT foreign keys (mot-commentaire)
                if (can_continue)                   {
                    try {
                        //con_sync.query('INSERT INTO `Mot-Racine` (root_id,mot) values(?,?)', )
                        con_sync.query('INSERT INTO `Mot-Racine` (mot) values(?) SELECT SCOPE_IDENTITY()', value);
                    }
                    catch (err) {
                        console.log("Error inserting word-root: " + err.message);
                    }
                }
            }

            //need to get all comments
            var comments;
            var words;
            con.query('SELECT texte FROM Discussion-Racine', (errorC, resultsC) => {
                if (errorC) throw errorC;
                
                //Next four lines get all of the stored comments
                comments=JSON.stringify(resultsC);
                console.log("Comments stringified: " + comments);
                comments=JSON.parse(comments);
                console.log("Entry 1: " + comments[0].texte);

                //need to get all words
                con.query('SELECT mot FROM Mot', (errorW,resultsW) => {
                    if (errorW) throw errorW;
                    words=JSON.stringify(resultsW);
                    words=JSON.parse(words);
                    console.log("Words: " + words);

//calculate SVD
                    let a = [];
                    var u,v,q;
                    let {u,v,q} = SVD(a);
                });
            });

        }//end of root comment IF
    }); //end inser root comment

    //var word_matrix = []
    var svd = [[]];


    res.send("Done!");
    console.log("Done publishing and analysing comment!");
});


app.listen(3001, function(){console.log('LSA app listening on port 3001!')});