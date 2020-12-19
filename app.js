const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const {
    Pool,
    Client
} = require('pg');
const {
    data
} = require("jquery");
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));


const pool = new Pool({
    user: 'project',
    host: 'localhost',
    database: 'test',
    password: 'password',
    port: 5432,
})

app.get('/', (req, res) => {
    res.render('index');
});
app.get('/trainInfo', (req, res) => {
    pool.query('select * from train', (error, result) => {
        if (error) {
            console.log(error);
            res.render("error",{error:error});
        } else {
            train_details = JSON.parse(JSON.stringify(result.rows));
            console.log(train_details);
            res.send(train_details);
        }
    });
});

app.get('/admin-login', (req, res) => {
    res.render('admin-login');
});

app.get('/booking-login', (req, res) => {
    res.render('booking-login');
});
// app.get('/booking-portal', (req, res) => {
//     // var train_details;
//     // pool.query('select * from train', (error, result) => {
//     //     if (error) {
//     //         console.log(error);
//     //         res.send(error);
//     //     } else {
//     //         train_details = JSON.parse(JSON.stringify(result.rows));
//     //         res.render('booking-portal', {
//     //             train_details: train_details
//     //         });

//     //     }
//     // });

// })


app.post('/admin-login', (req, res) => {

    var key = req.body.key;
    var password = req.body.password;
    console.log(key, password);
    pool.query('select * from admin where admin.key=$1 and admin.password=$2', [key, password], (error, results) => {
        if (error) {
            console.log(error);
            res.render("error",{error:error});
        } else {
            if (results.rows.length == 0) {
                res.render("error",{error:error});
            } else {
                res.render('admin-portal');
            }
        }
    });

});

app.post("/admin-portal", (req, res) => {
    var value = req.body; //returning object
    console.log(value);
    pool.query('insert into available_train(train_no,date,coach_ac,coach_sl,avail_ac,avail_sl) values($1,$2,$3,$4,$5,$6)', [value.train_no, value.date, value.ac_coaches, value.sl_coaches, 18 * value.ac_coaches, 24 * value.sl_coaches],
        (error, results) => {
            if (error) {
                res.render("error",{error:error});

            } else {
                res.render("success");
            }
        })

});

app.post("/validation-portal", (req, res) => {
    var data = req.body;
    if (req.body.identifier === 'fordate') {
        let todayFullDate = new Date();
        let year = todayFullDate.getFullYear();
        let month = todayFullDate.getMonth() + 1;
        let dt = todayFullDate.getDate();
        let total = year + '-' + month + '-' + dt;
        pool.query('select date from available_train where train_no=$1 and date>$2', [req.body.value, total], (error, results) => {
            if (error) {
                console.log("Error in getting Dates");
                res.render("error",{error:error});
            } else {
                let sender_object = [];
                let all_rows = results.rows;
                for (let x = 0; x < all_rows.length; x++) {
                    let date = new Date(String(all_rows[x].date));
                    let year = date.getFullYear();
                    let month = date.getMonth() + 1;
                    let dt = date.getDate();
                    let total = year + '-' + month + '-' + dt;
                    console.log(total);
                    sender_object.push({
                        date: total
                    })
                }
                res.send(sender_object);
            }
        })
    }
    if (req.body.identifier === 'forpassenger') {
        console.log(data);
        if (req.body.coach_type === 'AC') {
            pool.query('select avail_ac from available_train where train_no=$1 and date=$2', [data.train_no, data.date], (error, results) => {
                if (error) {
                    res.render("error",{error:error});
                }
                else {
                    res.send(results.rows);
                    console.log(results);
                }
            });
        }
        if (req.body.coach_type === 'SL') {
            pool.query('select avail_sl from available_train where train_no=$1 and date=$2', [data.train_no, data.date], (error, results) => {
                if (error){
                    res.render("error",{error:error});
                }
                else {
                    res.send(results.rows);
                    console.log(results.rows);
                }
            });
        }

    }
    if (data.identifier === 'checkAvailability') {
        let jsonData = JSON.stringify(data);
        pool.query('select check_availability($1)', [jsonData], (error, results) => {
            if (error) {
                console.log('Error in checkAvailability');
                res.render("error",{error:error});
            
            }
            else{
            res.send(results.rows);
            }
        })
    }
    if(data.identifier==='printTicket'){
        let pnr_no=data.pnr_no;
        let ticket={};
        ticket.PNR=pnr_no;
        pool.query('select * from print_ticket($1)', [pnr_no], (error, results) => {
            if (error) {
                console.log("error in printing ticket");
                console.log(error);
                res.render("error",{error:error});
            } else {
                let size=results.rows.length;
                let collection=results.rows;
                if(size===0){
                    console.log("Size came out to be 0");
                    res.render("error");
                }
                else{
                    let date = new Date(String(collection[0].date));
                    let year = date.getFullYear();
                    let month = date.getMonth() + 1;
                    let dt = date.getDate();
                    let total = year + '-' + month + '-' + dt;
                    ticket.date=total;
                    ticket.train_no=collection[0].train_no;
                    ticket.train_name=collection[0].train_name;
                    ticket.passengers=[];
                    for(let i=0;i<size;i++){
                        ticket.passengers.push(collection[i]);
                    }
                    console.log(ticket);
                    res.send(ticket);
                }
            }
        });
    }

    //res.send("EZ done ggg");
});

app.post('/booking-login', (req, res) => {
    var key = req.body.key;
    var password = req.body.password;
    console.log(key, password);
    pool.query('select * from booking_agent as b where b.bid=$1 and b.password=$2', [key, password], (error, results) => {
        if (error) {
            console.log(error);
            res.render("error",{error:error});
        } else {
            if (results.rows.length == 0) {
                res.render('error',{error:error});
            } else {
                res.render('booking-portal', {
                    key: key
                });


            }
        }
    });
});
app.post('/booking-portal', (req, res) => {
    let data = req.body;
    if (data.passengers === '1') {
        data.name = [data.name];
        data.age = [data.age];
        data.gender = [data.gender];
        console.log(data);
    }
    let jsonData = JSON.stringify(data);
    console.log(jsonData);
    pool.query('select * from update_passengers($1)', [jsonData], (error, results) => {
        if (error) {
            console.log("Error in booking portal updating passengers");
            console.log(error);
            console.log("error",{error:error});
        } else {
            let pnr_no = results.rows[0].update_passengers;
            let ticket = {};
            ticket.PNR = pnr_no;
            pool.query('select * from print_ticket($1)', [pnr_no], (error, results) => {
                if (error) {
                    console.log("error in printing ticket");
                    console.log(error);
                    res.render("error",{error:error})
                } else {
                    let size=results.rows.length;
                    let collection=results.rows;
                    if(size===0){
                        console.log("Size came out to be 0");
                        res.render("error",{error:'Size is zero'});
                    }
                    else{
                        let date = new Date(String(collection[0].date));
                        let year = date.getFullYear();
                        let month = date.getMonth() + 1;
                        let dt = date.getDate();
                        let total = year + '-' + month + '-' + dt;
                        ticket.date=total;
                        ticket.train_no=collection[0].train_no;
                        ticket.train_name=collection[0].train_name;
                        ticket.passengers=[];
                        for(let i=0;i<size;i++){
                            ticket.passengers.push(collection[i]);
                        }
                        console.log(ticket);
                        res.render('print-ticket',{ticket:ticket});
                    }
                }
            });
        }
    })
})
app.post('/', (req, res) => {
    res.send(req.body);
})
app.post("/printTicket",(req,res)=>{
    let ticket={};
    let pnr_no=req.body.pnr;
    ticket.PNR=req.body.pnr;
    console.log(req.body);
    pool.query('select * from print_ticket($1)', [pnr_no], (error, results) => {
        if (error) {
            console.log("error in printing ticket");
            console.log(error);
            res.render('error',{error:error});
        } else {
            let size=results.rows.length;
            let collection=results.rows;
            if(size===0){
                console.log("Size came out to be 0");
                res.render("error"<{error:"Size is zero"});
            }
            else{
                let date = new Date(String(collection[0].date));
                let year = date.getFullYear();
                let month = date.getMonth() + 1;
                let dt = date.getDate();
                let total = year + '-' + month + '-' + dt;
                ticket.date=total;
                ticket.train_no=collection[0].train_no;
                ticket.train_name=collection[0].train_name;
                ticket.passengers=[];
                for(let i=0;i<size;i++){
                    ticket.passengers.push(collection[i]);
                }
                console.log(ticket);
                res.render('print-ticket',{ticket:ticket});
            }
        }
    });
});

app.listen(80, function () {
    console.log("Server started Succesfully.");
});