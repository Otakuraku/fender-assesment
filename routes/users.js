const express = require("express");
const router = express.Router();
const databaseManager = require("../modules/database-manager");
const bodyParser = require("body-parser");
const randomstring = require("randomstring");

router.use(bodyParser.json());

router.post("/create", async (req,res,next) => {
    let { email, password, name } = req.body;
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    let response = {};
    let status = 200;
    let isTemporaryPassword = false;
    if (!emailRegex.test(email)) {
        response.error = "Invalid email.";
        status = 400;
    }else {
        if (!password) {
            password = randomstring.generate({ length: 12, charset: 'ABCEFGHJKMNPQRSTUVWXYZ0123456789' } );
            response.autoGenedPassword = password;
            isTemporaryPassword = true;
        }
        try {
            let createUserResponse = await databaseManager.createUser(email, password, name, isTemporaryPassword);
            if (createUserResponse.error) {
                console.error(createUserResponse.error);
                status = 400;
                response.error = createUserResponse.error;
            } else {
                response.ok = true;
            }
        } catch (error) {
            console.error(error);
            status = 500;
            response.error = "Internal server error.";
        }
    }
    if (req.isInternal) {
        return next(response);
    }
    return res.status(status).json( response );
});

router.patch("/update/:id", async (req,res, next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );
    let id = req.params.id;
    let { name, password } = req.body;

    let response = {};
    let status = 200;
    try {
        await databaseManager.updateUser(id,name);
        if (password) {
            await databaseManager.setPassword(id,password);
        }
        response.message = "User updated!";
    } catch (error) {
        console.error(error);
        status = 500;
        response.error = "Internal server error.";
    }

    if (req.isInternal) {
        return next(response);
    }

    res.status(status).json(response);
});

router.post("/setNewPassword" , async (req,res,next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );

    let response = {};
    let status = 200;
    try {
        await databaseManager.setPassword(req.session.idUser,req.body.password);
        response.message = "User password updated!";
    } catch (error) {
        console.error(error);
        status = 500;
        response.error = "Internal server error.";
    }

    if (req.isInternal) {
        return next(response);
    }

    res.status(status).json(response);
});

router.post("/changePassword", async (req,res) => {

});

router.post("/uploadProfilePic", async (req,res) => {

});

router.delete("/delete/:id", async (req,res, next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );
    let id = req.params.id;

    if (!id) {
        return res.status(400).json({ error: "No id received."});
    }

    let response = {};
    let status = 200;
    try {
        await databaseManager.deleteUser(id);
        response.message = "User deleted!";
    } catch (error) {
        console.error(error);
        status = 500;
        response.error = "Internal server error.";
    }

    if (req.isInternal) {
        return next(response);
    }

    res.status(status).json(response);
});

router.get("/list", async (req,res, next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );

    let status = 200;
    let response = await databaseManager.getUsers();

    if (req.isInternal) {
        return next({ users: response } );
    }
    res.status(status).json({ users: response });
});

router.post('/login', async (req, res, next) => {
    let { email, password } = req.body;

    let status = 200;
    let response = {};
    let loginResponse = await databaseManager.userLogin(email,password);
    if (!loginResponse) {
        status = 400;
        response.error = "Wrong email or password.";
    }else {
        req.session.idUser = loginResponse.id;
        req.session.userEmail = loginResponse.email;
        req.session.userName = loginResponse.name;
        response.ok = true;
        response = { ...response, ... loginResponse};
    }

    if (req.isInternal) {
        return next(response);
    }
    res.status(status).json(response);
});

router.get('/logout', async (req,res) => {
    req.session.destroy();
    return res.redirect('/');
});

router.get('/profile', async (req,res, next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );

    let status = 200;
    let response = await databaseManager.userProfile(req.session.idUser);

    if (req.isInternal) {
        return next(response);
    }
    res.status(status).json(response);
});

router.post('/favorite/pokemon/:id', async (req,res,next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );

    let status = 200;
    let response = await databaseManager.favoritePokemon(req.session.idUser,req.params.id);

    if (req.isInternal) {
        return next(response);
    }
    res.status(status).json(response);

});

router.delete('/favorite/pokemon/:id', async (req,res,next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );

    let status = 200;
    let response = await databaseManager.unfavoritePokemon(req.session.idUser,req.params.id);

    if (req.isInternal) {
        return next(response);
    }
    res.status(status).json(response);

});

router.post('/favorite/rick/:id', async (req,res,next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );

    let status = 200;
    let response = await databaseManager.favoriteRickAndMorty(req.session.idUser,req.params.id);

    if (req.isInternal) {
        return next(response);
    }
    res.status(status).json(response);
});

router.delete('/favorite/rick/:id', async (req,res,next) => {
    if (!req.session.idUser) return res.status(400).json({ error: "User not logged in." } );

    let status = 200;
    let response = await databaseManager.unfavoriteRickAndMorty(req.session.idUser,req.params.id);

    if (req.isInternal) {
        return next(response);
    }
    res.status(status).json(response);

});

module.exports = router;