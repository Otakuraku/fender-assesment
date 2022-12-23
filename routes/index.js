const express = require("express");
const router = express.Router();
const databaseManager = require("../modules/database-manager");
const bodyParser = require("body-parser");
const path = require("path");
const ApiConnector = require('api-connector');

let currentSession;

function getSessionData() {
    let data = {
        isLogged: false,
        isNotLogged: true
    };
    if (currentSession.idUser) {
        data.isLogged = true;
        data.isNotLogged = false;
    }
    if (currentSession.message) {
        data.message = currentSession.message;
        delete currentSession.message;
    }
    if (currentSession.error) {
        data.error = currentSession.error;
        delete currentSession.error;
    }
    return data;
}

router.use(bodyParser.json());

router.get('/', async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    data.isHome = true;
    return res.render('index', data);
});

router.get('/register', async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isLogged) return res.redirect("/profile");
    data.isRegister = true;
    return res.render("register",data);
});

router.post("/register", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    data.isRegister = true;

    let { name, email, password, password2 } = req.body;
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (!emailRegex.test(email)) {
        data.error = "Invalid email.";
    }else if (password.length < 6 && password.length > 0) {
        data.error = "The password must be at least 6 characters long.";
    }else if (password !== password2 && password.length > 0) {
        data.error = "Passwords don't match, verify you typed them correctly.";
    }else {
        req.url = "/user/create";
        req.isInternal = true;

        global.app._router.handle(req, res, finalize);
        return;
    }

    finalize();

    function finalize(response={}) {
        if (response.error) {
            data.error = response.error;
        }else if (response.ok) {
            currentSession.message = `User account '${email} created successfully!'`;

            if (response.autoGenedPassword) {
                currentSession.message += " Use password: "+response.autoGenedPassword;
            }
        }

        if (data.error) {
            data.name = name;
            data.email = email;
            console.log("Error: ",data.error);
            res.render("register",data);
        }else {
            res.redirect("/login");
        }
    }
});

router.get('/login', (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isLogged) return res.redirect("/profile");
    data.isLogin = true;

    res.render("login",data);
});

router.post("/login", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    data.isLogin = true;

    req.url = "/user/login";
    req.isInternal = true;

    global.app._router.handle(req,res, finalize);

    function finalize(response) {
        if (response.error) {
            data.error = response.error;
            res.render("login",data);
        }else if (response.temporaryPassword) {
            res.redirect("/changePassword");
        }else{
            res.redirect("/profile");
        }
    }
});

router.get("/logout", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");

    req.session.destroy();
    currentSession.message = "User logged out successfully!";

    return res.redirect('/login');
});

router.get("/changePassword", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");

    res.render("changePassword", data);
});

router.post("/changePassword", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");

    let { password, password2 } = req.body;

    if (password.length < 6) {
        data.error = "The password must be at least 6 characters long.";
    }else if (password !== password2 && password.length > 0) {
        data.error = "Passwords don't match, verify you typed them correctly.";
    }else {
        req.url = "/user/setNewPassword";
        req.isInternal = true;

        return global.app._router.handle(req,res, finalize);
    }

    if (data.error) {
        return res.render("changePassword",data);
    }

    function finalize(response) {
        if (response.error) {
            currentSession.error = response.error;
        }else {
            currentSession.message = "Password updated successfully!";
        }
        res.redirect("/profile");
    }
});

router.get("/profile", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isProfile = true;

    req.url = "/user/profile";
    req.isInternal = true;

    global.app._router.handle(req,res, finalize);

    async function finalize(response) {
        for (let i = 0 ; i < response.rickyFavs.length; i++) {
            let characterData = await ApiConnector.reqGet("https://rickandmortyapi.com/api/character/"+response.rickyFavs[i].idFavorite).start();
            response.rickyFavs[i].data = characterData.data;
        }
        for (let i = 0 ; i < response.pokemonFavs.length; i++) {
            let characterData = await ApiConnector.reqGet("https://pokeapi.co/api/v2/pokemon/"+response.pokemonFavs[i].idFavorite).start();
            // console.log("pokemon data:",characterData.data);
            response.pokemonFavs[i].data = characterData.data;
        }
        if (response.error) {
            data.error = response.error;
        }else {
            data = { ... data, ... response };
        }
        res.render("profile",data);
    }
});

router.get("/userList", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isUsers = true;

    req.url = "/user/list";
    req.isInternal = true;

    global.app._router.handle(req,res, finalize);

    function finalize(response) {
        if (response.error) {
            data.error = response.error;
        }else {
            for (let i = 0; i < response.users.length; i++) {
                if (currentSession.idUser === response.users[i].id) {
                    response.users[i].isMe = true;
                }
            }
            data = { ... data, ... response };
        }
        res.render("userList",data);
    }
});

router.get("/updateUser/:id", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isUsers = true;

    let userProfile = await databaseManager.userProfile(req.params.id);

    if (userProfile.error) {
        data.error = userProfile.error;
    }else {
        data = { ... data, ... userProfile.profile };
    }
    res.render("userUpdate",data);
});

router.post("/updateUser", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");

    let { id, name, password, password2 } = req.body;

    if (password) {
        if (password.length < 6) {
            data.error = "The password must be at least 6 characters long.";
        }else if (password !== password2 && password.length > 0) {
            data.error = "Passwords don't match, verify you typed them correctly.";
        }else {
            let response = await databaseManager.setPassword(id, password);
            if (response.error) {
                currentSession.error = response.error;
                return res.redirect("/updateUser/"+id);
            }
        }
    }

    if (data.error) {
        currentSession.error = data.error;
        return res.redirect("/updateUser/"+id);
    }

    let response = await databaseManager.updateUser(id,name);

    if (response.error) {
        currentSession.error = response.error;
        res.redirect("/updateUser/"+id);
    }else {
        currentSession.message = "User updated!";
        res.redirect("/userList");
    }
});

router.get("/deleteUser/:id", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isUsers = true;
    let id = req.params.id;

    let response = await databaseManager.deleteUser(id);

    if (response.error) {
        currentSession.error = response.error;
    }else {
        currentSession.message = "User deleted!";
    }
    res.redirect("/userList");
});

router.get("/rickandmorty", async (req,res) => {
    res.redirect("/rickandmorty/1");
});

router.get("/rickandmorty/:page", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isRickAndMorty = true;
    let page = parseInt(req.params.page);

    if (!global.rickAndMortyData) {
        global.rickAndMortyData = [];
    }

    if (!global.rickAndMortyData[page-1] || new Date() - global.rickAndMortyData[page-1].lastUpdate > 5 * 60 * 1000) {
        let result = await ApiConnector.reqGet("https://rickandmortyapi.com/api/character/?page="+page).start();
        global.maxRickAndPortyPages = result.data.info.pages;
        global.rickAndMortyData[page-1] = result.data.results;
        global.rickAndMortyData[page-1].lastUpdate = new Date();
        console.log("Updated page!"+page);
    }

    let userProfile = await databaseManager.userProfile(currentSession.idUser);

    for (let i = 0; i < global.rickAndMortyData[page-1].length; i++) {
        let current = global.rickAndMortyData[page-1][i];
        if (userProfile.rickyFavs.find( f => f.idFavorite === current.id)) {
            current.isFavorite = true;
        }else {
            current.isFavorite = false;
        }
        current.isNotFavorite = !current.isFavorite;
    }

    data = { ... data, ... {
        rickandmortycharacters: global.rickAndMortyData[page-1],
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < global.maxRickAndPortyPages  ? page+1 : null } };

    res.render("rickandmorty",data);
});

router.get("/rickandmorty/character/:id", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isRickAndMorty = true;
    let id = parseInt(req.params.id);
    let result = await ApiConnector.reqGet("https://rickandmortyapi.com/api/character/"+id).start();

    const chosenAttribs = ['id','status','species','type','gender','origin','location','created'];

    result.data.attributes = [];
    for (let i = 0; i < chosenAttribs.length; i++) {
        if (result.data[chosenAttribs[i]]) {
            let value = result.data[chosenAttribs[i]];
            if (chosenAttribs[i] === "origin" || chosenAttribs[i] === "location") {
                value = result.data[chosenAttribs[i]].name;
            }
            result.data.attributes.push( {
                label: chosenAttribs[i][0].toUpperCase()+chosenAttribs[i].substring(1),
                value
            });
        }
    }

    data = { ... data, ... result.data };

    res.render("rickandmortyCharacter",data);
});

router.get("/rickandmorty/favorite/:id", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isRickAndMorty = true;
    let id = parseInt(req.params.id);

    req.url = "/user/favorite/rick/"+id;
    req.method = "post";
    req.isInternal = true;

    global.app._router.handle(req,res, finalize);

    function finalize(response) {
        if (response.error) {
            currentSession.error = response.error;
        } else {
            currentSession.message = "Successfully added to favorites!";
        }
        res.redirect("/rickandmorty");
    }
});

router.get("/rickandmorty/unfavorite/:id", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isRickAndMorty = true;
    let id = parseInt(req.params.id);

    req.url = "/user/favorite/rick/"+id;
    req.method = "delete";
    req.isInternal = true;

    global.app._router.handle(req,res, finalize);

    function finalize(response) {
        if (response.error) {
            currentSession.error = response.error;
        } else {
            currentSession.message = "Successfully removed from favorites!";
        }
        res.redirect("/rickandmorty");
    }
});

router.get("/pokemon", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isPokemon = true;

    if (!global.pokemonLastUpdate || new Date() - global.pokemonLastUpdate > 5 * 60 * 1000) {
        let result = await ApiConnector.reqGet("https://pokeapi.co/api/v2/pokemon?limit=1500").start();
        global.pokemonData = result.data.results;
        global.pokemonLastUpdate = new Date();
    }

    let userProfile = await databaseManager.userProfile(currentSession.idUser);

    for (let i = 0; i < global.pokemonData.length; i++) {
        let current = global.pokemonData[i];
        let urlParts = current.url.split("/");
        current.id = parseInt(urlParts[urlParts.length-2]);
        if (userProfile.pokemonFavs.find( f => f.idFavorite === current.id)) {
            current.isFavorite = true;
        }else {
            current.isFavorite = false;
        }
        current.isNotFavorite = !current.isFavorite;
    }

    data = { ... data, ... { pokemonCharacters: global.pokemonData  } };

    res.render("pokemon",data);
});


router.get("/pokemon/favorite/:id", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isPokemon = true;
    let id = parseInt(req.params.id);

    req.url = "/user/favorite/pokemon/"+id;
    req.method = "post";
    req.isInternal = true;

    global.app._router.handle(req,res, finalize);

    function finalize(response) {
        if (response.error) {
            currentSession.error = response.error;
        } else {
            currentSession.message = "Successfully added to favorites!";
        }
        res.redirect("/pokemon");
    }
});

router.get("/pokemon/unfavorite/:id", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isPokemon = true;
    let id = parseInt(req.params.id);

    req.url = "/user/favorite/pokemon/"+id;
    req.method = "delete";
    req.isInternal = true;

    global.app._router.handle(req,res, finalize);

    function finalize(response) {
        if (response.error) {
            currentSession.error = response.error;
        } else {
            currentSession.message = "Successfully removed from favorites!";
        }
        res.redirect("/pokemon");
    }
});

router.get("/pokemon/character/:id", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isPokemon = true;
    let id = parseInt(req.params.id);
    let result = await ApiConnector.reqGet("https://pokeapi.co/api/v2/pokemon/"+id).start();
    console.log(result.data);

    const chosenAttribs = ['id','species','height','weight','base_experience'];

    result.data.attributes = [];
    for (let i = 0; i < chosenAttribs.length; i++) {
        if (result.data[chosenAttribs[i]]) {
            let value = result.data[chosenAttribs[i]];
            if (chosenAttribs[i] === "species") {
                value = result.data[chosenAttribs[i]].name;
            }
            result.data.attributes.push( {
                label: chosenAttribs[i][0].toUpperCase()+chosenAttribs[i].substring(1),
                value
            });
        }
    }

    data = { ... data, ... result.data };

    res.render("pokemonCharacter",data);
});

router.get("/versus", async (req,res) => {
    currentSession = req.session;
    let data = getSessionData();
    if (data.isNotLogged) return res.redirect("/login");
    data.isVersus = true;

    let response = await ApiConnector.reqGet("https://pokeapi.co/api/v2/pokemon").start();
    let totalPokemon = parseInt(response.data.count);
    //the api is returning 1154 as a total count, but only up to id 905 really exists.
    if (totalPokemon > 905) totalPokemon = 905;
    response = await ApiConnector.reqGet("https://rickandmortyapi.com/api/character").start();
    let totalRickAndMorty = parseInt(response.data.info.count);

    let rickAndMortyPickedId = 1 + Math.floor(Math.random() * totalRickAndMorty);
    let pokemonPickedId = 1 + Math.floor(Math.random() * totalPokemon);

    response = await ApiConnector.reqGet("https://rickandmortyapi.com/api/character/"+rickAndMortyPickedId).start();
    let rickAndMortyChar = response.data;
    response = await ApiConnector.reqGet("https://pokeapi.co/api/v2/pokemon/"+pokemonPickedId).start();
    let pokemonChar = response.data;

    data = { ... data, ... { rickAndMortyChar: rickAndMortyChar }, ... { pokemonChar: pokemonChar } };

    console.log(data);

    res.render("versus", data);
});

module.exports = router;