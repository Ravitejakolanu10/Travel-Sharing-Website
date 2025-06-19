import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import { error, log } from "console";
import nodemailer from "nodemailer";
import 'dotenv/config';


const app = express();
const port = 3000;

let otps = {};

//database
const db = new pg.Client({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});
db.connect((err) => {
    if (err) {
        console.error("Database connection error:", err.stack);
    } else {
        console.log("Database connected.");
    }
});


//uses
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));




app.use(session({
    secret: 'your_secret_key_12345',
    resave: false,
    saveUninitialized: false,
    cookie: 
 {
        maxAge: 3600000 // 1 hour in milliseconds
    }
}));

//Home
app.get("/", (req,res)=>{
    res.render("index.ejs",{
        update : "Hey!! How is Your Day!"
    });
})

//Register
app.get("/register",(req,res)=>{
    res.render("register.ejs",{
        message : ""
    });
})




app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    req.session.otp = otp;  // Store OTP in the session

    otps[email] = req.session.otp;
    
    // Use your function to send the OTP email
    await sendOtpViaEmail(email, otp);
    console.log("Otp Sent to ",email);
    console.log("OTP sent:", otp);


});



async function sendOtpViaEmail(userEmail, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // or another email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP sent successfully');
    } catch (error) {
        console.error('Error sending OTP:', error);
    }
}

//create
app.post("/create",async (req,res)=>{
    const fname = req.body.fname.toUpperCase();
    const lname = req.body.lname.toUpperCase();
    const vno = req.body.vno.toUpperCase();
    const number = req.body.number;
    const pass = req.body.pass;
    const vtype = req.body.vtype;
    const vname = req.body.vname.toUpperCase();
    const email = req.body.email;
    const otp = req.body.otp;
    console.log("User Data : ",fname,lname,vno,number,pass,vtype,vname,email);
    console.log(otp);
    
    console.log(otps[email]);
    
    
    if (parseInt(otp) !== otps[email]) {
        return res.render("register.ejs", {
            message: "Invalid OTP. Please try again."
        });
    }
        try{
            const response = await db.query("INSERT INTO customers (fname,lname,vehicle_no,phone,password,vehicle_type,vehicle_name) VALUES($1,$2,$3,$4,$5,$6,$7)",[fname,lname,vno,number,pass,vtype,vname]);
            console.log("Data Inserted");
            
        res.render("register.ejs",{
            message : "Registration Completed"
        });
        }
        catch(err)
        {
            console.log(err);
            res.render("register.ejs",{
                message : "Error Occured Due To Technical Issue"
            });
        }
     

})

//login_page
app.get("/login_page", (req,res)=>{
    res.render("login.ejs",{
        error : "Login SuccessFul"
    });
})

//login
app.get("/login",async (req,res)=>{
    const phone = req.query.phone;
    const pass = req.query.pass;
    console.log(phone,pass);
    req.session.phone = phone;
    req.session.pass = pass;
    console.log(req.session.phone,req.session.pass);
    if (!phone || !pass) {
        return res.render("login.ejs", { error: "Phone and password are required." });
    }
    

    try{
        const response = await db.query('SELECT * FROM customers WHERE phone = $1 AND password = $2',[phone,pass]);
        const result = response.rows[0];
        console.log(result);
        if(result){
            res.render("update.ejs",{
                error: "Login Successful"
            });
        }
        else{
            res.render("login.ejs",{
                error : "NO USER FOUND"
            });
        }
    }
    catch(err){
        console.log(err);
        res.render("login.ejs", {
            error: "An error occurred. Please try again."
        });
    }

})

//update Details

app.post("/update",async (req,res)=>{
    //user data
    const phone = req.session.phone;
    const pass = req.session.pass;
    console.log(phone,pass);
    
    //from input
    const from = req.body.from.toUpperCase();
    const to = req.body.to.toUpperCase();
    const price = req.body.price;
    const date = req.body.date;
    console.log(from,to,date,price);
    
    try{
        const response = await db.query('UPDATE customers SET from_loc = $1,to_loc = $2,t_date = $3,price = $6 WHERE phone = $4 AND password = $5 RETURNING *',[from,to,date,phone,pass,price]);
        const result = response.rows[0];
        if(result){
            res.render("update.ejs",{
                error : "Location Updated"
            })
        }
        else{
            res.render("update.ejs",{
                error : "Please Enter Valid Data"
            })
        }
    }
    catch(err){
        console.log(err);
        res.render("update.ejs",{
            error : "There is a Technical Issue"
        });
    }
})

//searching for Driver 

app.get("/search",async (req,res)=>{
    const from = req.query.from.toUpperCase();
    const to = req.query.to.toUpperCase();
    const date = req.query.date;
    console.log(from,to,date);
    
    try{
        const response = await db.query('SELECT * FROM customers WHERE from_loc = $1 AND to_loc = $2 ',[from,to]);
        const result = response.rows;
        console.log(result);
        res.render("list.ejs",{
            error : result
        });
    }
    catch(err)
    {
        console.log(err);
        res.render("index.ejs",{
            update : "Heyy"
        })
    }
})

//Booking page
app.get("/book", (req,res)=>{
    const driverId = req.query.driver_id; // Retrieve driver_id from query parameters
    req.session.driverId = driverId;
    res.render("booking.ejs",{
        bookingId : " "
    });
})

//Booking id To Email
async function BookingId(userEmail, id) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // or another email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Booking Information',
        text: `Your Booking id : ${id}`
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('Booking Id sent successfully');
    } catch (error) {
        console.error('Error sending OTP:', error);
    }
}

//Booking details
app.post("/booking", async (req, res) => {
    const driverId = req.session.driverId;
    // req.session.driverId
    console.log(driverId,req.session.driverId);
    
    const { name, phone,  email, total } = req.body;
    const pickup = req.body.pickup.toUpperCase();
    console.log("User Details:", name, phone, pickup, email, total);
    
    // Validate required fields
    if (!name || !phone || !pickup || !email || !total) {
        return res.status(400).send("All fields are required.");
    }


    const booking_id = Date.now(); 
    

    try {
        const result = await db.query(
            'INSERT INTO users (username, email, phone, total, booking_id, pickup_location) VALUES ($1, $2, $3, $4, $5, $6)',
            [name, email, phone, total, booking_id, pickup]
        );
        
        const data =await db.query('UPDATE customers SET booking_id = $1 WHERE id = $2',[booking_id, driverId]);
        
        

        res.render("booking.ejs", {
            message: "Booking successful!",
            bookingId : booking_id
        });
    } catch (err) {
        console.error("Database error:", err);
        res.render("booking.ejs", {
            bookingId : booking_id,
            message: "There was an error with your booking. Please try again."
        });
    }
    await BookingId(email,booking_id);
});


//booking Status
app.get('/booked', async (req, res) => {
    const booking_id = req.query.booking_id;

    // Validate if booking_id is provided
    if (!booking_id) {
        return res.render("index.ejs", { update: "Please enter a valid booking ID." });
    }

    try {
        // Query to join `users` and `customers` tables based on `booking_id`
        const result = await db.query(
            `SELECT 
                u.booking_id,
                u.username,
                u.email,
                u.phone ,
                u.pickup_location,
                u.total,
                c.t_date,
                c.to_loc,
                c.fname ,
                c.lname ,
                c.vehicle_no,
                c.phone AS driver_phone,
                c.vehicle_type,
                c.vehicle_name
             FROM users u
             JOIN customers c ON u.booking_id = c.booking_id
             WHERE u.booking_id = $1`,
            [booking_id]
        );

        // Check if booking details are found
        if (result.rows.length > 0) {
            res.render("bookingStatus.ejs", { booking: result.rows[0] });
        } else {
            res.render("index.ejs", { update: "Booking not found." });
        }
    } catch (err) {
        console.error("Database error:", err);
        res.render("index.ejs", { update: "Error fetching booking status." });
    }
});



//port
app.listen(port, ()=>{
    console.log(`Server Running from Port ${port}`);
})

