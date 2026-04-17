import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";
import fileUpload from "express-fileupload";


const app = express();
const port = 3000;
const saltRound = 10;
env.config()

//Middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ entended: true }));
app.use(fileUpload());
app.set("view engine", "ejs");

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60,
    }
}));

app.use(passport.initialize());
app.use(passport.session(undefined));


const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: {
        rejectUnauthorized: false,
    }
});

db
    .connect()
    .then(() => console.log("Database Connected!"))
    .catch((e) => console.log("Database connection failed: ", e));


app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/home", (req, res) => {
    res.redirect("/");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }

    try {
        const foundResult = await db.query(
            "SELECT * FROM found_items WHERE user_id = $1",
            [req.user.id]
        );
        const findBuffer = foundResult.rows;

        const lostResult = await db.query(
            "SELECT * FROM lost_items WHERE user_id = $1",
            [req.user.id]
        );
        const lostBuffer = lostResult.rows;

        res.render("dashboard.ejs", {
            name: req.user.name,
            username: req.user.username,
            found_item_info: findBuffer,
            lost_item_info: lostBuffer,
        });

    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Server Error");
    }
});

app.get("/reportfound", (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        res.render("report_found.ejs", { name: user.name, username: user.username });
    } else {
        res.redirect("/login");
    }
});

app.get("/reportlost", (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        res.render("report_lost.ejs", { name: user.name, username: user.username });
    } else {
        res.redirect("/login");
    }
});

app.get('/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
});

app.get('/deletefound/:id', async (req, res) => {
    const itemId = req.params.id; 
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    try {
        await db.query("DELETE FROM found_items WHERE id = $1",
            [itemId]);
        
        console.log(`Deleted item with ID: ${itemId}`);
        res.redirect('/dashboard'); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting item");
    }
});

app.get('/deletelost/:id', async (req, res) => {
    const itemId = req.params.id;
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    } 
    try {
        await db.query("DELETE FROM lost_items WHERE id = $1",
            [itemId]);
        
        console.log(`Deleted item with ID: ${itemId}`);
        res.redirect('/dashboard'); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting item");
    }
});

app.get('/editfound/:id', async (req, res) => {
    const itemId = req.params.id;
    const user = req.user;
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    try {
        const storedData = await db.query("SELECT * FROM found_items WHERE id = $1",
            [itemId]);

        const details = storedData.rows[0];
        res.render("edit_found.ejs", { name:user.name, item:details });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error Editing Information!");
    }
    
});

app.get('/editlost/:id', async (req, res) => {
    const itemId = req.params.id;
    const user = req.user;
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    try {
        const storedData = await db.query("SELECT * FROM lost_items WHERE id = $1",
            [itemId]);

        const details = storedData.rows[0];
        console.log(storedData.rows[0].item_name);
        res.render("edit_lost.ejs", { name:user.name, item:details });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error Editing Information!");
    }
    
});

app.get("/lost", async (req, res) => {
    
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    try {
        const user = req.user;
        const result = await db.query("SELECT users.name, lost_items.id, lost_items.user_id, lost_items.item_name, lost_items.item_details, lost_items.location, lost_items.lost_date, lost_items.picture, lost_items.mimetype FROM users INNER JOIN lost_items ON users.id = lost_items.user_id");
        const details = result.rows;
        res.render("lost.ejs", { lost_item_info: details, name: user.name });
    }catch(err) {
        console.error(err);
        res.status(500).send("Error fetching Information!");
    }
});

app.get("/found", async (req, res) => {
    
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    try {
        const user = req.user;
        const result = await db.query("SELECT users.name, found_items.id, found_items.user_id, found_items.item_name, found_items.item_details, found_items.location, found_items.found_date, found_items.picture, found_items.mimetype FROM users INNER JOIN found_items ON users.id = found_items.user_id");
        const details = result.rows;
        res.render("found.ejs", { found_item_info: details, name: user.name });
    }catch(err) {
        console.error(err);
        res.status(500).send("Error fetching Information!");
    }
});

app.get("/profile", async(req, res) =>{
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    try {
        const user = req.user;
        res.render("profile.ejs", { name:user.name, username:user });
        
    }catch(err) {
        console.error(err);
        res.status(500).send("Error fetching Information!");
    }

});

app.get("/browse-lost", async(req, res) =>{
    try {
        const result = await db.query("SELECT users.name, lost_items.id, lost_items.user_id, lost_items.item_name, lost_items.item_details, lost_items.location, lost_items.lost_date, lost_items.picture, lost_items.mimetype FROM users INNER JOIN lost_items ON users.id = lost_items.user_id");
        const details = result.rows;
        res.render("browse_lost.ejs", { lost_item_info: details });
    }catch(err) {
        console.error(err);
        res.status(500).send("Error fetching Information!");
    }
})

app.get("/browse-found", async(req, res) =>{
    try {
        const result = await db.query("SELECT users.name, found_items.id, found_items.user_id, found_items.item_name, found_items.item_details, found_items.location, found_items.found_date, found_items.picture, found_items.mimetype FROM users INNER JOIN found_items ON users.id = found_items.user_id");
        const details = result.rows;
        res.render("browse_found.ejs", { found_item_info: details });
    }catch(err) {
        console.error(err);
        res.status(500).send("Error fetching Information!");
    }
})
app.post("/register", async (req, res) => {
    const inputName = req.body.name;
    const inputRegisterUsername = req.body["login_id"];
    const inputRegisterPassword = req.body["login_pass"];

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE username = $1",
            [inputRegisterUsername]
        );

        if (checkResult.rows.length > 0) {
            res.send("Email already exists, Try logging in.")
        } else {
            //hashing
            bcrypt.hash(inputRegisterPassword, saltRound, async (err, hash) => {
                if (err) {
                    console.log("Error hashing password: ", err);
                } else {
                    const result = await db.query("INSERT INTO users (username, password, name) VALUES ($1, $2, $3)",
                        [inputRegisterUsername, hash, inputName]
                    );
                    res.redirect("/login");

                }
            });
        }
    } catch (err) {
        console.log("Error registering", err);
    }
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
}));


app.post("/findformsubmit", async (req, res) => {
    const itemName = req.body.itemname;
    const itemDetails = req.body.itemdetails;
    const location = req.body.location;
    const findDate = req.body.finddate;
    
    const itemPicture = req.files.picture.data;
    const type = req.files.picture.mimetype;

    const user = req.user;
    const userId = user.id;
    try {
        await db.query("INSERT INTO found_items (user_id, item_name, item_details, location, found_date, picture, mimetype) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [userId, itemName, itemDetails, location, findDate, itemPicture, type]);

        res.redirect("/dashboard");
    } catch (err) {
        console.log("Error report find Items: ", err);
    }
});
app.post("/findformedit/:id", async (req, res) => {
    const itemId = req.params.id;
    const itemName = req.body.itemname;
    const itemDetails = req.body.itemdetails;
    const location = req.body.location;
    const findDate = req.body.finddate;
    
    const itemPicture = req.files.picture.data;
    const type = req.files.picture.mimetype;

    const user = req.user;
    const userId = user.id;
    try {
        await db.query("UPDATE found_items SET user_id = $1, item_name = $2, item_details = $3, location = $4, found_date = $5, picture = $6, mimetype = $7 WHERE id = $8",
            [userId, itemName, itemDetails, location, findDate, itemPicture, type, itemId]
        );

        res.redirect("/dashboard");
    } catch (err) {
        console.log("Error editing report find Items: ", err);
        res.status(500).send("Error submitting updated data!");
    }
});

app.post("/lostformsubmit", async (req, res) => {
    const itemName = req.body.itemname;
    const itemDetails = req.body.itemdetails;
    const location = req.body.location;
    const lostDate = req.body.lostdate;
    
    const itemPicture = req.files.picture.data;
    const type = req.files.picture.mimetype;

    const user = req.user;
    const userId = user.id;


    try {
        await db.query("INSERT INTO lost_items (user_id, item_name, item_details, location, lost_date, picture, mimetype) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [userId, itemName, itemDetails, location, lostDate, itemPicture, type]);

        res.redirect("/dashboard");
    } catch (err) {
        console.log("Error report find Items: ", err);
    }
});

app.post("/lostformedit/:id", async (req, res) => {
    const itemId = req.params.id;
    const itemName = req.body.itemname;
    const itemDetails = req.body.itemdetails;
    const location = req.body.location;
    const lostDate = req.body.lostdate;
    
    const itemPicture = req.files.picture.data;
    const type = req.files.picture.mimetype;

    const user = req.user;
    const userId = user.id;
    try {
        await db.query("UPDATE lost_items SET user_id = $1, item_name = $2, item_details = $3, location = $4, lost_date = $5, picture = $6, mimetype = $7 WHERE id = $8",
            [userId, itemName, itemDetails, location, lostDate, itemPicture, type, itemId]
        );

        res.redirect("/dashboard");
    } catch (err) {
        console.log("Error editing lost Items: ", err);
        res.status(500).send("Error submitting updated data!");
    }
});



passport.use(new Strategy(async function verify(username, password, cb) {
    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1",
            [username]
        );
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashedPassword = user.password;
            bcrypt.compare(password, storedHashedPassword, (err, result) => {
                if (err) {
                    return cb(err);
                } else {
                    if (result) {
                        return cb(null, user);
                    } else {
                        return cb(null, false);
                    }
                }
            });
        } else {
            return cb("User not found");
        }
    } catch (err) {
        return cb(err);
    }

}));

passport.serializeUser((user, cb) => { cb(null, user) });
passport.deserializeUser((user, cb) => { cb(null, user) });

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`)
});

