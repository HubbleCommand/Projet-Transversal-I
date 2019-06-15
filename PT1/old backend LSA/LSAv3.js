const express=require('express');
const mysql=require('mysql');
const mysql_sync=require('sync-mysql');
const bodyParser=require('body-parser');
const jama=require('jama');

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
            res.send("Something went wrong! " + errorS.message);
        }
        else    {
            res.send(resultsS);
        }
    });
});

function TFIDF (Nij, Nstarj, D, Di) {
    return  ((Nij/Nstarj) * Math.log(D/Di));
}

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
                        con_sync.query('INSERT INTO `Mot-Racine` (mot) values(?) SELECT SCOPE_IDENTITY()', value);
                    }
                    catch (err) {
                        console.log("Error inserting word-root: " + err.message);
                    }
                }
            }

//V2 for calculating LSA/LSI
            var m = con_sync.query('SELECT COUNT(*) FROM Discussion');  //find number of discussions M
            var n = con_sync.query('SELECT COUNT(*) FROM Mot');         //find number of words N
            var occurance_matrix = new jama.Matrix(m,n,0);              //create M * N jama.Matrix
            //then can use this below, and use Matrix.set(i,j, val) to update Matrix
                
            con.query('SELECT * FROM Mot-Discussion', (errorMDD, resultsMDD) => {
                if(errorMDD)    {                }
                else    {
                    //optimized construct matrix beforehand with Jama
                    //for every element in sql response, update value in matrix
                    for (var index = 0; index < resultsMDD.length; index++) {
                        occurance_matrix.set(
                            //is +1 needed on indexes?
                                //nope! index starts at 0
                            resultsMDD[index].comment_id,
                            resultsMDD[index].mot_id,
                            resultsMDD[index].occurances);
                    }
                    
                    //pre-weigh occurances done here with TF-IDF
                    //tfidf = ;
                    //Algo for doing TFIDF
                        //
                    var wighted_occurance_matrix = new jama.Matrix(m,n,0);
                    for (var i = 0; i < occurance_matrix.length; i++)   {
                        for (var j = 0; i < occurance_matrix[i].length; i++)    {
                            
                            var Nij = occurance_matrix.get(i,j);

                            //count number of words -> non-zero entries
                            for (var q = 0; q <= occurance_matrix.getRowDimension(); i++)   {

                            }
                            var Nstarj = occurance_matrix;
                            var D;
                            var Di;
                            
                            
                            var tfidf = ((Nij/Nstarj) * Math.log(D/Di));
                        }
                    }

                //Calculate SVD
                    var lsi = occurance_matrix.svd();
                    var svd = lsi.getU();

                    //Need to do a synchronous update to all 
                        //values of the Weight parameter in Mot-Discussion
                    var discussions_to_update = svd.getRowDimension();
                    var number_of_words = svd.getColumnDimension();
                    for (var i = 0; i < discussions_to_update; i++) {
                        for (var j = 0; j < number_of_words; j++)    {
                            try {
                                con_sync('UPDATE Mot-Discussion SET weight=? WHERE discussion_id=?, mot_id=?', [svd.get(i,j), i, j])
                            }
                            catch (err) {
                                console.log("Error updating weight for Word: " + j + ", and for Discussion: " + i)
                            }
                        }
                    }                    
                }
            });

        }//end of root comment IF
    }); //end insert root comment

    //var word_matrix = []

    res.send("Done!");  console.log("Done publishing and analysing comment!");
});

app.listen(3003, function() {
    console.log('LSAv3 listening on port 3003!')

    var a = [
        [1,2,3],
        [3,2,1]
   ];
   
   var a_matrix = new jama.Matrix(a);
   console.log("Matrix A: " + a_matrix.getArray());
   var svded = a_matrix.svd();
   console.log("Matrix A SVD U: " + a_matrix.svd().getU().getArray());
   
   var matrix = jama.Matrix(3,3);
   console.log("Matrix: " + matrix);
   
   console.log("Matrix 2: " + jama.Matrix(3,3));
});